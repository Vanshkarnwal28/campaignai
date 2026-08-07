import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { getPlanPricing } from './payment.constants';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Create an Instamojo Payment Request for a plan upgrade
   */
  async createPaymentRequest(params: {
    userId?: string;
    businessId: string;
    plan: string;
    redirectUrl?: string;
  }) {
    this.logger.log(`Payment request received for businessId: ${params.businessId}, plan: ${params.plan}`);

    const apiKey = process.env.INSTAMOJO_API_KEY;
    const authToken = process.env.INSTAMOJO_AUTH_TOKEN;
    const baseUrl = process.env.INSTAMOJO_BASE_URL || 'https://api.instamojo.com';

    if (!apiKey || !authToken) {
      this.logger.error('Payment creation failed: Instamojo API credentials (API_KEY or AUTH_TOKEN) missing in environment');
      throw new BadRequestException('Payment gateway credentials not configured on server');
    }

    // 1. Get business and user profile
    const business = await this.firebase.getBusinessById(params.businessId);
    if (!business) {
      this.logger.error(`Payment creation failed: Business workspace ${params.businessId} not found`);
      throw new NotFoundException('Business workspace not found');
    }

    let userEmail = 'customer@campaignai.com';
    let userName = business.name || 'CampaignAI User';
    let userId = params.userId || business.ownerId;

    if (business.ownerId) {
      const user = await this.firebase.getUserById(business.ownerId);
      if (user) {
        userEmail = user.email || userEmail;
        userName = user.name || userName;
      }
    }

    // 2. Derive plan pricing server-side ONLY (never trust client)
    let pricing;
    try {
      pricing = getPlanPricing(params.plan);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Invalid subscription plan');
    }
    if (pricing.amount <= 0) {
      throw new BadRequestException('Free tier does not require payment gateway processing');
    }

    const defaultRedirect = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/profile`
      : 'http://localhost:3000/profile';
    const redirectUrl = params.redirectUrl || defaultRedirect;

    // Construct Webhook URL
    const backendHost = process.env.BACKEND_URL || 'http://localhost:3001';
    const webhookUrl = `${backendHost.replace(/\/$/, '')}/api/payment/webhook`;

    // 3. Prepare Form Data for Instamojo REST API v1.1
    const formData = new URLSearchParams();
    formData.append('purpose', `CampaignAI ${pricing.name} Subscription`);
    formData.append('amount', pricing.amount.toFixed(2));
    formData.append('buyer_name', userName);
    formData.append('email', userEmail);
    formData.append('redirect_url', redirectUrl);
    formData.append('webhook', webhookUrl);
    formData.append('send_email', 'true');
    formData.append('send_sms', 'false');
    formData.append('allow_repeated_payments', 'false');

    try {
      this.logger.log(`Calling Instamojo API to create payment request: ${baseUrl}/api/1.1/payment-requests/`);
      const instamojoRes = await axios.post(
        `${baseUrl.replace(/\/$/, '')}/api/1.1/payment-requests/`,
        formData.toString(),
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Auth-Token': authToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = instamojoRes.data;
      if (!data || !data.success || !data.payment_request) {
        this.logger.error(`Payment creation failed on Instamojo: ${JSON.stringify(data)}`);
        throw new BadRequestException(data?.message || 'Failed to generate Instamojo payment link');
      }

      const paymentRequest = data.payment_request;
      const paymentRequestId = paymentRequest.id;
      const paymentUrl = paymentRequest.longurl || paymentRequest.shorturl;

      // 4. Save pending payment record in Firebase `payments` collection
      const paymentRecord = {
        paymentRequestId,
        transactionId: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        userId: userId || 'unknown-user',
        businessId: params.businessId,
        plan: pricing.name,
        amount: pricing.amount,
        currency: pricing.currency,
        status: 'PENDING',
        paymentUrl,
        redirectUrl,
        webhookUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gatewayResponse: paymentRequest,
      };

      await this.firebase.col('payments').doc(paymentRequestId).set(paymentRecord);

      this.logger.log(`Payment created successfully. ID: ${paymentRequestId}, URL: ${paymentUrl}`);

      return {
        success: true,
        paymentUrl,
        paymentRequestId,
        status: 'PENDING',
        plan: pricing.name,
        amount: pricing.amount,
        currency: pricing.currency,
      };
    } catch (err: any) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`Payment creation failed: ${errMsg}`);
      throw new BadRequestException(`Payment gateway error: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * Verify and process Instamojo Webhook (IPN)
   */
  async processWebhook(payload: Record<string, string>) {
    this.logger.log(`Webhook received: ${JSON.stringify(payload)}`);

    const privateSalt = process.env.INSTAMOJO_PRIVATE_SALT;
    if (!privateSalt) {
      this.logger.error('Webhook verification failed: INSTAMOJO_PRIVATE_SALT missing');
      throw new BadRequestException('Payment gateway salt not configured');
    }

    // 1. Verify HMAC-SHA1 MAC Signature
    const receivedMac = payload.mac;
    if (!receivedMac) {
      this.logger.error('Webhook verification failed: Missing MAC signature');
      throw new BadRequestException('Missing MAC signature');
    }

    // Build MAC verification string: Sort keys alphabetically (case-insensitively), excluding 'mac'
    const sortedKeys = Object.keys(payload)
      .filter((k) => k.toLowerCase() !== 'mac')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const signString = sortedKeys.map((k) => payload[k] || '').join('|');
    const expectedMac = crypto
      .createHmac('sha1', privateSalt)
      .update(signString)
      .digest('hex');

    if (receivedMac.toLowerCase() !== expectedMac.toLowerCase()) {
      this.logger.error(`Webhook verification failed: MAC signature mismatch. Expected: ${expectedMac}, Got: ${receivedMac}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log('Webhook verified successfully');

    // 2. Idempotency Check
    const paymentRequestId = payload.payment_request_id;
    const paymentId = payload.payment_id;
    const status = payload.status; // 'Credit' = successful payment in Instamojo

    if (!paymentRequestId) {
      this.logger.warn('Webhook payload missing payment_request_id');
      return { success: true, message: 'Ignored missing payment_request_id' };
    }

    // Check existing payment in Firestore
    const paymentDoc = await this.firebase.col('payments').doc(paymentRequestId).get();
    const existingPayment = paymentDoc.exists ? paymentDoc.data() : null;

    if (existingPayment && (existingPayment.status === 'PAID' || existingPayment.status === 'COMPLETED')) {
      this.logger.log(`Webhook duplicate call safely ignored for paymentRequestId: ${paymentRequestId}`);
      return { success: true, message: 'Payment already processed and activated' };
    }

    // 3. Process payment status
    if (status === 'Credit') {
      const businessId = existingPayment?.businessId || payload.custom_fields;
      const plan = existingPayment?.plan || 'PRO';

      this.logger.log(`Payment verified (status: Credit). Activating subscription for businessId: ${businessId}, plan: ${plan}`);

      // Update payment record in `payments` collection
      await this.firebase.col('payments').doc(paymentRequestId).set(
        {
          paymentId: paymentId || `MOJO-${Date.now()}`,
          status: 'PAID',
          gatewayPayload: payload,
          updatedAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
        },
        { merge: true },
      );

      if (businessId) {
        await this.activateSubscription(businessId, plan, paymentId, paymentRequestId);
      }

      this.logger.log(`Subscription activated for businessId: ${businessId}`);
      return { success: true, message: 'Subscription successfully activated' };
    } else {
      this.logger.warn(`Payment not completed. Status: ${status}`);
      await this.firebase.col('payments').doc(paymentRequestId).set(
        {
          status: 'FAILED',
          gatewayPayload: payload,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return { success: false, message: `Payment status is ${status}` };
    }
  }

  /**
   * Check payment status by paymentRequestId
   */
  async getPaymentStatus(paymentRequestId: string) {
    this.logger.log(`Payment status check requested for paymentRequestId: ${paymentRequestId}`);

    const doc = await this.firebase.col('payments').doc(paymentRequestId).get();
    if (!doc.exists) {
      throw new NotFoundException(`Payment record not found for ID: ${paymentRequestId}`);
    }

    const payment = doc.data();

    // If status is still PENDING, verify with Instamojo API directly
    if (payment.status === 'PENDING') {
      const apiKey = process.env.INSTAMOJO_API_KEY;
      const authToken = process.env.INSTAMOJO_AUTH_TOKEN;
      const baseUrl = process.env.INSTAMOJO_BASE_URL || 'https://api.instamojo.com';

      if (apiKey && authToken) {
        try {
          const res = await axios.get(`${baseUrl}/api/1.1/payment-requests/${paymentRequestId}/`, {
            headers: {
              'X-Api-Key': apiKey,
              'X-Auth-Token': authToken,
            },
          });

          if (res.data?.success && res.data?.payment_request) {
            const req = res.data.payment_request;
            if (req.status === 'Completed' || req.payments?.some((p: any) => p.status === 'Credit')) {
              this.logger.log(`Payment verified via Instamojo direct lookup for ID: ${paymentRequestId}`);
              payment.status = 'PAID';
              await this.firebase.col('payments').doc(paymentRequestId).set(
                { status: 'PAID', updatedAt: new Date().toISOString() },
                { merge: true },
              );
              if (payment.businessId) {
                await this.activateSubscription(payment.businessId, payment.plan, req.payments?.[0]?.payment_id || paymentRequestId, paymentRequestId);
              }
            }
          }
        } catch (e: any) {
          this.logger.warn(`Could not verify payment status with Instamojo API: ${e.message}`);
        }
      }
    }

    this.logger.log(`Payment status for ${paymentRequestId}: ${payment.status}`);

    return {
      paymentRequestId,
      status: payment.status,
      plan: payment.plan,
      amount: payment.amount,
      currency: payment.currency,
      businessId: payment.businessId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Send UPI Collect Push to user's VPA (Virtual Payment Address) via Instamojo
   */
  async sendUpiCollect(paymentRequestId: string, vpa: string) {
    this.logger.log(`Sending UPI Collect for paymentRequestId: ${paymentRequestId}, VPA: ${vpa}`);
    const apiKey = process.env.INSTAMOJO_API_KEY;
    const authToken = process.env.INSTAMOJO_AUTH_TOKEN;
    const baseUrl = process.env.INSTAMOJO_BASE_URL || 'https://api.instamojo.com';

    if (!apiKey || !authToken) {
      throw new BadRequestException('Payment gateway credentials not configured');
    }

    const formData = new URLSearchParams();
    formData.append('vpa', vpa);
    formData.append('payment_request_id', paymentRequestId);

    try {
      const res = await axios.post(
        `${baseUrl.replace(/\/$/, '')}/api/1.1/send-upi-collect/`,
        formData.toString(),
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Auth-Token': authToken,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return { success: true, data: res.data };
    } catch (err: any) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.warn(`UPI Collect failed: ${errMsg}`);
      return { success: false, message: errMsg };
    }
  }

  /**
   * Confirm UPI Payment Approval status from Instamojo
   */
  async confirmUpiPayment(paymentRequestId: string) {
    this.logger.log(`Confirming UPI payment for paymentRequestId: ${paymentRequestId}`);
    const apiKey = process.env.INSTAMOJO_API_KEY;
    const authToken = process.env.INSTAMOJO_AUTH_TOKEN;
    const baseUrl = process.env.INSTAMOJO_BASE_URL || 'https://api.instamojo.com';

    if (!apiKey || !authToken) {
      throw new BadRequestException('Payment gateway credentials not configured');
    }

    try {
      const res = await axios.get(
        `${baseUrl.replace(/\/$/, '')}/api/1.1/payment-requests/${paymentRequestId}/`,
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Auth-Token': authToken,
          },
        },
      );
      const req = res.data?.payment_request;
      const isCompleted = req?.status === 'Completed' || req?.payments?.some((p: any) => p.status === 'Credit');

      if (isCompleted) {
        const doc = await this.firebase.col('payments').doc(paymentRequestId).get();
        const paymentData = doc.exists ? doc.data() : {};
        await this.firebase.col('payments').doc(paymentRequestId).set(
          { status: 'PAID', updatedAt: new Date().toISOString() },
          { merge: true },
        );
        if (paymentData?.businessId) {
          await this.activateSubscription(paymentData.businessId, paymentData.plan, req?.payments?.[0]?.payment_id, paymentRequestId);
        }
      }

      return { success: true, confirmed: isCompleted, status: req?.status || 'UNKNOWN' };
    } catch (err: any) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.warn(`UPI confirmation failed: ${errMsg}`);
      return { success: false, confirmed: false, message: errMsg };
    }
  }

  /**
   * Download payment invoice as PNG image (branded receipt)
   */
  async downloadInvoice(paymentId: string): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    this.logger.log(`Generating invoice for paymentId: ${paymentId}`);

    // Find payment by doc ID or paymentId field
    let paymentData: any = null;
    const directDoc = await this.firebase.col('payments').doc(paymentId).get();
    if (directDoc.exists) {
      paymentData = directDoc.data();
    } else {
      const snap = await this.firebase.col('payments').where('paymentId', '==', paymentId).limit(1).get();
      if (!snap.empty) paymentData = snap.docs[0].data();
    }

    if (!paymentData) {
      throw new NotFoundException(`Payment record not found for ID: ${paymentId}`);
    }

    // Generate branded invoice PNG using canvas
    const { createCanvas } = await import('@napi-rs/canvas');
    const width = 794;
    const height = 1123; // A4 proportional
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0B1727';
    ctx.fillRect(0, 0, width, height);

    // Header bar
    const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
    headerGrad.addColorStop(0, '#7C3AED');
    headerGrad.addColorStop(1, '#6366F1');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, 120);

    // Company name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('CampaignAI', 40, 60);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Payment Invoice', 40, 90);

    // Invoice badge
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(width - 200, 30, 160, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('INVOICE', width - 170, 58);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(new Date(paymentData.createdAt || Date.now()).toLocaleDateString('en-IN'), width - 175, 78);

    // Details section
    const details = [
      ['Plan', paymentData.plan || 'N/A'],
      ['Amount', `₹${(paymentData.amount || 0).toFixed(2)} ${paymentData.currency || 'INR'}`],
      ['Status', paymentData.status || 'N/A'],
      ['Payment ID', paymentId],
      ['Business ID', paymentData.businessId || 'N/A'],
      ['Date', new Date(paymentData.createdAt || Date.now()).toLocaleDateString('en-IN')],
    ];

    let y = 180;
    for (const [label, value] of details) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(40, y, width - 80, 48);
      ctx.fillStyle = 'rgba(124,58,237,0.8)';
      ctx.fillRect(40, y, 4, 48);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '13px sans-serif';
      ctx.fillText(label, 60, y + 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(String(value), 60, y + 40);
      y += 60;
    }

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, height - 80, width, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px sans-serif';
    ctx.fillText('Thank you for your business! Support: support@campaignai.app', 40, height - 45);
    ctx.fillText('CampaignAI © 2025 — All rights reserved', 40, height - 25);

    const pdfBuffer = canvas.toBuffer('image/png');
    const fileName = `Invoice_${paymentId}_${Date.now()}.png`;

    return { pdfBuffer, fileName };
  }

  /**
   * Internal Helper: Activate user subscription in Firestore
   */
  private async activateSubscription(businessId: string, plan: string, paymentId?: string, paymentRequestId?: string) {
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const subData = {
      businessId,
      plan: plan.toUpperCase(),
      status: 'ACTIVE',
      startDate: startDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      nextBillingDate: expiryDate.toISOString(),
      autoRenew: true,
      updatedAt: startDate.toISOString(),
      lastPaymentId: paymentId || paymentRequestId || '',
    };

    // Update `subscriptions` collection
    const subs = await this.firebase.getSubscriptionsByBusinessId(businessId);
    let activeSub = subs.find((s: any) => s.status === 'ACTIVE');
    if (activeSub) {
      await this.firebase.updateSubscription(activeSub.id, subData);
    } else {
      await this.firebase.createSubscription(subData);
    }

    // Update `businesses` collection
    await this.firebase.updateBusiness(businessId, {
      subscriptionPlan: plan.toUpperCase(),
      updatedAt: startDate.toISOString(),
    });
  }
}
