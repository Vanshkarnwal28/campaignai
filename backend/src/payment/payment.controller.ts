import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FirebaseService } from '../firebase/firebase.service';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * STEP 3 - Payment Creation API
   * POST /payment/create
   * Protected by JWT Auth. Accepts { plan: 'starter' }
   */
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    this.logger.log(`POST /payment/create called by user: ${req.user?.uid || req.user?.id}`);

    let businessId = dto.businessId;

    if (!businessId && req.user?.uid) {
      const userDoc = await this.firebaseService.getUserById(req.user.uid);
      if (userDoc?.businessId) {
        businessId = userDoc.businessId;
      } else {
        const businesses = await this.firebaseService.getBusinessesByUserId(req.user.uid);
        if (businesses && businesses.length > 0) {
          businessId = businesses[0].id;
        }
      }
    }

    if (!businessId) {
      businessId = req.user?.businessId || req.user?.uid || 'default-business';
    }

    return this.paymentService.createPaymentRequest({
      userId: req.user?.uid || req.user?.id,
      businessId,
      plan: dto.plan,
      redirectUrl: dto.redirectUrl,
    });
  }

  /**
   * STEP 5 - Webhook Endpoint
   * POST /payment/webhook
   * Public route for Instamojo IPN callbacks
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: Record<string, string>) {
    this.logger.log('POST /payment/webhook received IPN notification');
    return this.paymentService.processWebhook(payload);
  }

  /**
   * STEP 6 - Payment Verification / Status API
   * GET /payment/status/:paymentRequestId
   */
  @Get('status/:paymentRequestId')
  async getPaymentStatus(@Param('paymentRequestId') paymentRequestId: string) {
    this.logger.log(`GET /payment/status/${paymentRequestId} called`);
    return this.paymentService.getPaymentStatus(paymentRequestId);
  }

  /**
   * Send UPI Collect Push notification to user's UPI App VPA handle
   * POST /payment/send-upi-collect
   */
  @Post('send-upi-collect')
  async sendUpiCollect(@Body() body: { paymentRequestId: string; vpa: string }) {
    return this.paymentService.sendUpiCollect(body.paymentRequestId, body.vpa);
  }

  /**
   * Confirm UPI Payment Approval
   * POST /payment/confirm-upi
   */
  @Post('confirm-upi')
  async confirmUpiPayment(@Body() body: { paymentRequestId: string }) {
    return this.paymentService.confirmUpiPayment(body.paymentRequestId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoice/:paymentId')
  async downloadInvoice(@Param('paymentId') paymentId: string, @Res() res: any) {
    const invoice = await this.paymentService.downloadInvoice(paymentId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.fileName}"`,
      'Cache-Control': 'private, no-store',
    });
    return res.send(invoice.pdfBuffer);
  }
}
