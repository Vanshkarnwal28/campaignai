export {};

/**
 * System Integration Test Suite — End-to-End Live Component Validation
 */
const assert = require('assert');
const { FirebaseService } = require('../src/firebase/firebase.service');
const { AiService } = require('../src/ai/ai.service');
const { GraphicGeneratorService } = require('../src/content/graphic-generator.service');
const { IntegrationsService } = require('../src/integrations/integrations.service');
const { CloudTasksService } = require('../src/scheduler/cloud-tasks.service');
const { SchedulerService } = require('../src/scheduler/scheduler.service');
const { calculateScheduledTimestamps } = require('../src/utils/schedule-calculator');

async function runIntegrationTestSuite() {
  console.log('===========================================================================');
  console.log('⚡ END-TO-END INTEGRATION TEST SUITE: system.integration.test.ts');
  console.log('===========================================================================\n');

  // Initialize Core Services
  const firebaseService = new FirebaseService();
  firebaseService.onModuleInit();
  const usersDao = firebaseService.usersDao;
  const workspacesDao = firebaseService.workspacesDao;
  const socialPostsDao = firebaseService.socialPostsDao;
  const aiService = new AiService();
  const graphicGenerator = new GraphicGeneratorService();
  const integrationsService = new IntegrationsService(firebaseService, aiService);
  const cloudTasksService = new CloudTasksService();
  const schedulerService = new SchedulerService(firebaseService, integrationsService);

  // STEP 1: Live User & Workspace Creation via Firestore DAOs
  console.log('1. [Firestore DAOs Integration] Creating Test User & Workspace...');
  const testUser = await usersDao.create({
    email: 'integration.test@techvision.ai',
    name: 'Integration Test User',
    role: 'MEMBER',
  });
  assert.ok(testUser && testUser.id);
  await usersDao.update(testUser.id, {
    metaAccessToken: 'mock_token_60days',
    metaIgBusinessAccountId: '17841400011223344',
  });

  const testWorkspace = await workspacesDao.create({
    name: 'TechVision Integration SaaS',
    ownerId: testUser.id,
    businessNiche: 'Digital Marketing SaaS',
    brandVibe: 'High-Energy & Bold',
    currentOffer: 'GET 50% OFF UNLIMITED INSTAGRAM AUTO-SCHEDULING',
  });
  assert.ok(testWorkspace && testWorkspace.id);

  // Connect Meta credentials using live IntegrationsService OAuth exchange flow
  await integrationsService.connectMeta('mock_auth_code_123', testWorkspace.id);
  console.log(`   ✅ Workspace & User created in Firestore with Meta Credentials (Workspace ID: ${testWorkspace.id}).`);

  // STEP 2: Live AI Instagram Content Generation (Gemini / OpenRouter)
  console.log('\n2. [AI Gemini Integration] Generating Instagram Caption & 15 Hashtags...');
  const aiContent = await aiService.generateInstagramPost(
    testWorkspace.businessNiche,
    testWorkspace.brandVibe,
    testWorkspace.currentOffer
  );
  assert.ok(aiContent.caption && typeof aiContent.caption === 'string');
  assert.strictEqual(Array.isArray(aiContent.hashtags), true);
  assert.strictEqual(aiContent.hashtags.length, 15);
  console.log(`   ✅ Generated AI Caption (${aiContent.caption.substring(0, 45)}...) + 15 Hashtags.`);

  // STEP 3: Live 1080x1080 Graphic Composite & Firebase Storage Upload
  console.log('\n3. [Graphics & Storage Integration] Rendering 1080x1080 Graphic & Uploading to Storage...');
  const graphicBuffer = await graphicGenerator.generateBrandedGraphicBuffer({
    businessName: testWorkspace.name,
    offerText: testWorkspace.currentOffer,
    niche: testWorkspace.businessNiche,
    vibe: testWorkspace.brandVibe,
  });
  assert.ok(graphicBuffer.length > 5000);

  const uploadResult = await firebaseService.uploadFileBuffer(
    graphicBuffer,
    `graphics/${testWorkspace.id}/${Date.now()}.png`,
    'image/png'
  );
  assert.ok(uploadResult.publicUrl && uploadResult.publicUrl.startsWith('http'));
  console.log(`   ✅ Branded Graphic Uploaded to Storage. Public Download URL: ${uploadResult.publicUrl}`);

  // STEP 4: Live Schedule Calculation (10 Timestamps at 10:00 AM Local Time)
  console.log('\n4. [Schedule Calculator Integration] Calculating 10 Posting Timestamps...');
  const scheduledTimestamps = calculateScheduledTimestamps(new Date(), 'every_5_days');
  assert.strictEqual(scheduledTimestamps.length, 10);
  const nextRunDate = new Date(scheduledTimestamps[0]);
  assert.strictEqual(nextRunDate.getHours(), 10);
  console.log(`   ✅ Calculated 10 Timestamps. Next execution: ${nextRunDate.toISOString()}`);

  // STEP 5: Live Social_Posts DAO Integration
  console.log('\n5. [Social_Posts DAO Integration] Saving Scheduled Post to Firestore...');
  const createdPost = await socialPostsDao.create({
    workspaceId: testWorkspace.id,
    authorId: testUser.id,
    caption: `${aiContent.caption}\n\n${aiContent.hashtags.join(' ')}`,
    imageUrl: uploadResult.publicUrl,
    scheduleTime: new Date(scheduledTimestamps[0]).toISOString(),
    status: 'SCHEDULED',
  });
  assert.ok(createdPost && createdPost.id);
  console.log(`   ✅ Created Post ID: ${createdPost.id} with status SCHEDULED.`);

  // STEP 6: Live Cloud Tasks Enqueuing
  console.log('\n6. [Cloud Tasks Integration] Enqueuing HTTP Target Task...');
  const enqueueResult = await cloudTasksService.enqueueScheduledPosts([
    { postId: createdPost.id, timestampMs: scheduledTimestamps[0], businessId: testWorkspace.id }
  ]);
  assert.strictEqual(enqueueResult.length, 1);
  assert.strictEqual(enqueueResult[0].success, true);
  console.log(`   ✅ Enqueued Task ID: ${enqueueResult[0].taskId} targeting HTTP endpoint.`);

  // STEP 7: Live Cloud Tasks Worker Webhook Execution & Instagram Graph API 2-Step Workflow
  console.log('\n7. [Instagram Worker Integration] Executing Webhook Worker (publishSinglePost)...');
  const workerResult = await schedulerService.publishSinglePost(createdPost.id);
  console.log('   [DEBUG workerResult]:', JSON.stringify(workerResult, null, 2));
  assert.strictEqual(workerResult.success, true);
  assert.strictEqual(workerResult.status, 'PUBLISHED');
  assert.ok(workerResult.post && workerResult.post.publishedAt);
  console.log(`   ✅ Webhook Executed Successfully. Container ID: ${workerResult.publishResult.containerId} | Post ID: ${workerResult.publishResult.instagramPostId}`);

  // STEP 8: Final Firestore Document Verification
  console.log('\n8. [Firestore Verification] Verifying Final Post Status in Database...');
  const finalPost = await socialPostsDao.findById(createdPost.id);
  assert.strictEqual(finalPost.status, 'PUBLISHED');
  assert.ok(finalPost.publishedAt);
  assert.strictEqual(finalPost.publishResult.success, true);
  console.log(`   ✅ Firestore Document Status verified as PUBLISHED at ${finalPost.publishedAt}.`);

  console.log('\n===========================================================================');
  console.log('🎉 SYSTEM.INTEGRATION.TEST.TS: END-TO-END WORKFLOW PASSED 100% SUCCESSFULLY!');
  console.log('===========================================================================\n');
}

runIntegrationTestSuite().catch((err) => {
  console.error('❌ system.integration.test.ts Failed:', err);
  process.exit(1);
});
