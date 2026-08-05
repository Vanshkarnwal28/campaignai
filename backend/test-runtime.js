const axios = require('axios');

async function runRuntimeTests() {
  console.log('=== STARTING REAL HTTP RUNTIME VALIDATION ===');
  
  // We assume NestJS server is running or we test running server endpoints
  const baseURL = 'http://localhost:3001/api';

  const results = {
    passed: [],
    failed: [],
    details: {},
  };

  function logPass(testName, info) {
    console.log(`✅ PASSED: ${testName}`);
    results.passed.push(testName);
    results.details[testName] = info;
  }

  function logFail(testName, error) {
    console.log(`❌ FAILED: ${testName} - ${error.message} (Status: ${error.response?.status})`);
    results.failed.push({ testName, error: error.message, status: error.response?.status });
  }

  // 1. Auth Config
  try {
    const res = await axios.get(`${baseURL}/auth/config`);
    logPass('GET /auth/config', res.data);
  } catch (e) { logFail('GET /auth/config', e); }

  // 2. Register
  let authToken = '';
  const testEmail = `testuser_${Date.now()}@campaignai.com`;
  try {
    const res = await axios.post(`${baseURL}/auth/register`, {
      email: testEmail,
      name: 'Runtime Test User',
      password: 'Password123!',
      preferredLanguage: 'English',
    });
    authToken = res.data.token;
    logPass('POST /auth/register', { userId: res.data.user?.id, tokenPresent: !!authToken });
  } catch (e) { logFail('POST /auth/register', e); }

  // 3. Login
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: testEmail,
      password: 'Password123!',
    });
    authToken = res.data.token;
    logPass('POST /auth/login', { userId: res.data.user?.id, businessId: res.data.user?.businessId });
  } catch (e) { logFail('POST /auth/login', e); }

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 4. Get Profile
  let testBusinessId = '';
  try {
    const res = await axios.get(`${baseURL}/auth/profile`, { headers: authHeaders });
    testBusinessId = res.data.businessId;
    logPass('GET /auth/profile', { email: res.data.email, businessId: testBusinessId, onboardingCompleted: res.data.onboardingCompleted });
  } catch (e) { logFail('GET /auth/profile', e); }

  // 5. Update Language
  try {
    const res = await axios.post(`${baseURL}/auth/profile/language`, { preferredLanguage: 'Hinglish' }, { headers: authHeaders });
    logPass('POST /auth/profile/language', res.data);
  } catch (e) { logFail('POST /auth/profile/language', e); }

  // 6. Onboarding Questions
  try {
    const res = await axios.get(`${baseURL}/business/onboarding/questions?lang=English`, { headers: authHeaders });
    logPass('GET /business/onboarding/questions', { totalQuestions: res.data.questions?.length });
  } catch (e) { logFail('GET /business/onboarding/questions', e); }

  // 7. Start Onboarding Chat
  try {
    const res = await axios.post(`${baseURL}/business/${testBusinessId}/onboarding/start`, {}, { headers: authHeaders });
    logPass('POST /business/:id/onboarding/start', { conversationId: res.data.conversationId, firstMessage: res.data.messages?.[0]?.content?.substring(0, 50) });
  } catch (e) { logFail('POST /business/:id/onboarding/start', e); }

  // 8. Chat Onboarding Message
  try {
    const res = await axios.post(`${baseURL}/business/${testBusinessId}/onboarding/chat`, { message: 'We sell organic skincare products for women' }, { headers: authHeaders });
    logPass('POST /business/:id/onboarding/chat', { replySnippet: res.data.reply?.substring(0, 60), completed: res.data.completed });
  } catch (e) { logFail('POST /business/:id/onboarding/chat', e); }

  // 9. Submit Onboarding Answers
  try {
    const answers = [
      { q: 'Business Name', a: 'GlowSkin Organic' },
      { q: 'Industry', a: 'Skincare & Cosmetics' },
      { q: 'Products/Services', a: 'Natural Face Serums' },
      { q: 'Target Audience', a: 'Women aged 20-45' },
      { q: 'Monthly Budget', a: '5000' },
      { q: 'Brand Tone', a: 'Warm & Professional' },
      { q: 'USP', a: '100% Toxin-free organic ingredients' },
    ];
    const res = await axios.post(`${baseURL}/business/${testBusinessId}/onboarding/submit`, { answers }, { headers: authHeaders });
    logPass('POST /business/:id/onboarding/submit', { profileId: res.data.id, industry: res.data.industry });
  } catch (e) { logFail('POST /business/:id/onboarding/submit', e); }

  // 10. Get Business Context
  try {
    const res = await axios.get(`${baseURL}/business/${testBusinessId}/context`, { headers: authHeaders });
    logPass('GET /business/:id/context', { businessName: res.data.businessName, blueprintApproved: res.data.blueprintApproved });
  } catch (e) { logFail('GET /business/:id/context', e); }

  // 11. Get Blueprint
  let blueprintId = '';
  try {
    const res = await axios.get(`${baseURL}/business/${testBusinessId}/blueprint`, { headers: authHeaders });
    blueprintId = res.data.active?.id || res.data.history?.[0]?.id || '';
    logPass('GET /business/:id/blueprint', { activeVersion: res.data.active?.version, historyCount: res.data.history?.length });
  } catch (e) { logFail('GET /business/:id/blueprint', e); }

  // 12. Approve Blueprint
  try {
    const res = await axios.post(`${baseURL}/business/${testBusinessId}/blueprint/approve`, { blueprintId }, { headers: authHeaders });
    logPass('POST /business/:id/blueprint/approve', { approved: res.data.approved, version: res.data.version });
  } catch (e) { logFail('POST /business/:id/blueprint/approve', e); }

  // 13. Regenerate Blueprint
  try {
    const res = await axios.post(`${baseURL}/business/${testBusinessId}/blueprint/regenerate`, {}, { headers: authHeaders });
    logPass('POST /business/:id/blueprint/regenerate', { newVersion: res.data.version });
  } catch (e) { logFail('POST /business/:id/blueprint/regenerate', e); }

  // Re-approve latest blueprint
  try {
    const bpRes = await axios.get(`${baseURL}/business/${testBusinessId}/blueprint`, { headers: authHeaders });
    const latestId = bpRes.data.history?.[0]?.id || bpRes.data.active?.id;
    await axios.post(`${baseURL}/business/${testBusinessId}/blueprint/approve`, { blueprintId: latestId }, { headers: authHeaders });
  } catch (e) { console.error('Approve latest error:', e.message); }

  // 14. Generate Monthly Strategy
  try {
    const res = await axios.post(`${baseURL}/content/strategy/generate`, { businessId: testBusinessId }, { headers: authHeaders });
    logPass('POST /content/strategy/generate', { version: res.data.version, focus: res.data.monthlyCampaignFocus });
  } catch (e) { logFail('POST /content/strategy/generate', e); }

  // 15. Fetch Strategy
  try {
    const res = await axios.get(`${baseURL}/content/strategy?businessId=${testBusinessId}`, { headers: authHeaders });
    logPass('GET /content/strategy', { focus: res.data.monthlyCampaignFocus, version: res.data.version });
  } catch (e) { logFail('GET /content/strategy', e); }

  // 16. Generate Monthly Calendar
  try {
    const res = await axios.post(`${baseURL}/content/calendar/generate`, {
      businessId: testBusinessId,
      selectedDays: ['Monday', 'Wednesday', 'Friday'],
      durationWeeks: 4,
    }, { headers: authHeaders });
    logPass('POST /content/calendar/generate', { count: res.data.entries?.length, message: res.data.message });
  } catch (e) { logFail('POST /content/calendar/generate', e); }

  // 17. Fetch Calendar Paginated
  let firstPostId = '';
  try {
    const res = await axios.get(`${baseURL}/content/calendar?businessId=${testBusinessId}&page=1&limit=10&status=DRAFT`, { headers: authHeaders });
    firstPostId = res.data.entries?.[0]?.id || '';
    logPass('GET /content/calendar (Paginated)', { total: res.data.total, count: res.data.entries?.length, page: res.data.page });
  } catch (e) { logFail('GET /content/calendar', e); }

  // 18. Post Operations
  if (firstPostId) {
    // Edit
    try {
      const res = await axios.patch(`${baseURL}/content/calendar/${firstPostId}`, { headline: 'Updated Headline' }, { headers: authHeaders });
      logPass('PATCH /content/calendar/:id (Edit)', { headline: res.data.entry?.headline });
    } catch (e) { logFail('PATCH /content/calendar/:id (Edit)', e); }

    // Approve
    try {
      const res = await axios.patch(`${baseURL}/content/calendar/${firstPostId}/approve`, { approvedBy: 'Test Admin' }, { headers: authHeaders });
      logPass('PATCH /content/calendar/:id/approve', { status: res.data.entry?.status });
    } catch (e) { logFail('PATCH /content/calendar/:id/approve', e); }

    // Reschedule
    try {
      const res = await axios.patch(`${baseURL}/content/calendar/${firstPostId}/reschedule`, { scheduledTime: '2026-08-20T10:00:00.000Z' }, { headers: authHeaders });
      logPass('PATCH /content/calendar/:id/reschedule', { scheduledTime: res.data.entry?.scheduledTime });
    } catch (e) { logFail('PATCH /content/calendar/:id/reschedule', e); }

    // Duplicate
    let copyId = '';
    try {
      const res = await axios.post(`${baseURL}/content/calendar/${firstPostId}/duplicate`, {}, { headers: authHeaders });
      copyId = res.data.entry?.id;
      logPass('POST /content/calendar/:id/duplicate', { copyId });
    } catch (e) { logFail('POST /content/calendar/:id/duplicate', e); }

    // Reject copy
    if (copyId) {
      try {
        const res = await axios.patch(`${baseURL}/content/calendar/${copyId}/reject`, { reason: 'Test rejection' }, { headers: authHeaders });
        logPass('PATCH /content/calendar/:id/reject', { status: res.data.entry?.status });
      } catch (e) { logFail('PATCH /content/calendar/:id/reject', e); }

      // Delete copy
      try {
        const res = await axios.delete(`${baseURL}/content/calendar/${copyId}`, { headers: authHeaders });
        logPass('DELETE /content/calendar/:id', res.data);
      } catch (e) { logFail('DELETE /content/calendar/:id', e); }
    }

    // Regenerate Single Post
    try {
      const res = await axios.post(`${baseURL}/content/calendar/${firstPostId}/regenerate`, {}, { headers: authHeaders });
      logPass('POST /content/calendar/:id/regenerate', { headline: res.data.entry?.headline });
    } catch (e) { logFail('POST /content/calendar/:id/regenerate', e); }
  }

  // 19. Bulk Approve
  try {
    const calRes = await axios.get(`${baseURL}/content/calendar?businessId=${testBusinessId}&limit=5`, { headers: authHeaders });
    const idsToApprove = calRes.data.entries?.map(e => e.id) || [];
    if (idsToApprove.length > 0) {
      const res = await axios.post(`${baseURL}/content/bulk/approve`, { ids: idsToApprove, approvedBy: 'Bulk Admin' }, { headers: authHeaders });
      logPass('POST /content/bulk/approve', { count: res.data.count });
    }
  } catch (e) { logFail('POST /content/bulk/approve', e); }

  // 20. Deferred Endpoint Check (501 Expected)
  try {
    await axios.post(`${baseURL}/content/regenerate-week`, { businessId: testBusinessId, weekNumber: 1 }, { headers: authHeaders });
  } catch (e) {
    if (e.response?.status === 501) {
      logPass('POST /content/regenerate-week (HTTP 501 Deferred)', { status: 501, message: e.response.data?.message });
    } else { logFail('POST /content/regenerate-week', e); }
  }

  // 21. Meta Integration Status & OAuth URL
  try {
    const res = await axios.get(`${baseURL}/meta/auth-url?businessId=${testBusinessId}`, { headers: authHeaders });
    logPass('GET /meta/auth-url', { urlPresent: !!res.data.url });
  } catch (e) { logFail('GET /meta/auth-url', e); }

  try {
    const res = await axios.get(`${baseURL}/meta/status?businessId=${testBusinessId}`, { headers: authHeaders });
    logPass('GET /meta/status', { connected: res.data.connected, mock: res.data.mock });
  } catch (e) { logFail('GET /meta/status', e); }

  try {
    const res = await axios.get(`${baseURL}/meta/pages?businessId=${testBusinessId}`, { headers: authHeaders });
    logPass('GET /meta/pages', { pagesCount: res.data?.length });
  } catch (e) { logFail('GET /meta/pages', e); }

  // 22. Assistant RAG Chat
  try {
    const res = await axios.post(`${baseURL}/assistant/chat`, { businessId: testBusinessId, message: 'How do I connect Meta?' }, { headers: authHeaders });
    logPass('POST /assistant/chat', { conversationId: res.data.conversationId, replySnippet: res.data.reply?.substring(0, 60) });
  } catch (e) { logFail('POST /assistant/chat', e); }

  console.log('\n=== RUNTIME VALIDATION SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  return results;
}

// Start backend server and run tests
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { ValidationPipe } = require('@nestjs/common');

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix('api');
  const server = await app.listen(3001);
  console.log('NestJS Backend instance started for runtime testing on http://localhost:3001/api');

  try {
    await runRuntimeTests();
  } finally {
    await server.close();
    console.log('Test server closed.');
  }
}

main().catch(err => {
  console.error('Runtime Validation Fatal Error:', err);
  process.exit(1);
});
