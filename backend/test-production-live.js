const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function runProductionValidation() {
  console.log('=== STARTING PRODUCTION INTEGRATION VALIDATION ===');
  
  const report = {
    openrouter: { success: false, details: null, error: null },
    meta: { success: false, details: null, error: null },
    instamojo: { success: false, details: null, error: null },
    firebase: { mode: 'MockDb', project: null },
  };

  // 1. Test OpenRouter Live API Call
  console.log('\n1. Testing OpenRouter Live API Connection...');
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
  
  if (openRouterKey && !openRouterKey.includes('your_')) {
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: 'You are a test assistant. Return JSON.' },
            { role: 'user', content: 'Say "hello" in JSON format {"message": "hello"}' },
          ],
          temperature: 0.1,
          max_tokens: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://campaignai.app',
            'X-Title': 'DIPARI AI Test',
          },
          timeout: 15000,
        },
      );

      const content = res.data?.choices?.[0]?.message?.content;
      report.openrouter = {
        success: true,
        model: res.data?.model || model,
        responseSnippet: content?.substring(0, 80),
        durationMs: res.headers['x-response-time'] || 'N/A',
      };
      console.log('✅ OpenRouter Live API succeeded:', report.openrouter.responseSnippet);
    } catch (e) {
      report.openrouter = {
        success: false,
        error: e.response?.data?.error?.message || e.message,
        status: e.response?.status,
      };
      console.log('❌ OpenRouter Live API failed:', report.openrouter.error);
    }
  } else {
    report.openrouter = { success: false, error: 'OPENROUTER_API_KEY is placeholder or missing' };
  }

  // 2. Test Meta App API Connection
  console.log('\n2. Testing Meta Graph API Client Credentials...');
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (appId && appSecret && !appId.includes('your_')) {
    try {
      // Obtain App Access Token via Graph API
      const res = await axios.get(
        `https://graph.facebook.com/v19.0/oauth/access_token`,
        {
          params: {
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'client_credentials',
          },
          timeout: 10000,
        },
      );

      report.meta = {
        success: true,
        appId,
        tokenType: res.data?.token_type,
        appAccessTokenPresent: !!res.data?.access_token,
      };
      console.log('✅ Meta Developer App Credentials verified against Graph API v19.0');
    } catch (e) {
      report.meta = {
        success: false,
        appId,
        error: e.response?.data?.error?.message || e.message,
        status: e.response?.status,
      };
      console.log('❌ Meta Graph API verification failed:', report.meta.error);
    }
  } else {
    report.meta = { success: false, error: 'META_APP_ID / META_APP_SECRET missing or placeholder' };
  }

  // 3. Test Instamojo Live Credentials
  console.log('\n3. Testing Instamojo Payment Gateway API...');
  const instaKey = process.env.INSTAMOJO_API_KEY;
  const instaAuth = process.env.INSTAMOJO_AUTH_TOKEN;
  const instaBaseUrl = process.env.INSTAMOJO_BASE_URL || 'https://api.instamojo.com';

  if (instaKey && instaAuth && !instaKey.includes('your_')) {
    try {
      // Test credentials via Instamojo v1.1 REST API endpoint
      const res = await axios.get(`${instaBaseUrl}/api/1.1/payment-requests`, {
        headers: {
          'X-Api-Key': instaKey,
          'X-Auth-Token': instaAuth,
        },
        timeout: 10000,
      });

      report.instamojo = {
        success: true,
        requestsCount: res.data?.payment_requests?.length || 0,
      };
      console.log('✅ Instamojo API credentials verified successfully');
    } catch (e) {
      report.instamojo = {
        success: false,
        error: e.response?.data?.message || e.response?.data || e.message,
        status: e.response?.status,
      };
      console.log('⚠️ Instamojo API check response:', report.instamojo.error);
    }
  } else {
    report.instamojo = { success: false, error: 'INSTAMOJO_API_KEY / INSTAMOJO_AUTH_TOKEN missing' };
  }

  // 4. Test Firebase Config Status
  console.log('\n4. Checking Firebase Admin Setup...');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  if (projectId && clientEmail) {
    report.firebase = { mode: 'LiveFirestore', projectId, clientEmail };
    console.log(`✅ Firebase configured for Live Firestore: ${projectId}`);
  } else {
    report.firebase = { mode: 'MockFirestore (Local mock-db.json)', projectId: null };
    console.log('ℹ️ Firebase running in local MockFirestore mode (FIREBASE_PROJECT_ID unset)');
  }

  console.log('\n=== PRODUCTION INTEGRATION REPORT SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));

  return report;
}

runProductionValidation().then(() => {
  console.log('\nProduction Validation Finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal Production Test Error:', err);
  process.exit(1);
});
