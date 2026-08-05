require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { IntegrationsService } = require('./dist/src/integrations/integrations.service');
const { SchedulerService } = require('./dist/src/scheduler/scheduler.service');
const { CloudTasksService } = require('./dist/src/scheduler/cloud-tasks.service');
const { calculateScheduledTimestamps } = require('./dist/src/utils/schedule-calculator');

async function runTest() {
  console.log('=== TESTING FIREBASE CLOUD TASKS ASYNCHRONOUS QUEUING INFRASTRUCTURE ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const integrationsService = new IntegrationsService(fbService, null);
  const schedulerService = new SchedulerService(fbService, integrationsService);
  const cloudTasksService = new CloudTasksService();

  // 2. Generate 10 calculated timestamps using schedule calculator utility
  console.log('1. Calculating 10 future execution timestamps via Schedule Calculator...');
  const startDate = new Date('2026-08-01T08:00:00.000Z');
  const timestamps = calculateScheduledTimestamps(startDate, 'every_5_days');
  console.log('   ✅ Generated 10 Timestamps (Ms):', timestamps.slice(0, 3), '...');

  // 3. Create mock posts in Firestore
  console.log('\n2. Creating 10 Scheduled Post Documents in Firestore...');
  const workspace = await fbService.workspacesDao.create({
    name: 'Cloud Tasks Demo Business',
    niche: 'Technology & SaaS',
    vibe: 'High-Energy & Bold',
  });

  const postTasks = [];
  for (let i = 0; i < 10; i++) {
    const post = await fbService.createScheduledPost({
      businessId: workspace.id,
      caption: `Automated Social Post #${i + 1} scheduled via Cloud Tasks! 🚀`,
      platform: i % 2 === 0 ? 'Instagram' : 'Facebook',
      scheduledTime: new Date(timestamps[i]),
      status: 'SCHEDULED',
    });

    postTasks.push({
      postId: post.id,
      timestampMs: timestamps[i],
      businessId: workspace.id,
    });
  }

  console.log(`   ✅ Created 10 Firestore Post Docs. Sample ID: ${postTasks[0].postId}`);

  // 4. Test CloudTasksService.enqueueScheduledPosts
  console.log('\n3. Enqueuing HTTP Target Tasks into Firebase Cloud Tasks Queue...');
  const enqueueResults = await cloudTasksService.enqueueScheduledPosts(postTasks);

  console.log(`   ✅ Total Enqueued Tasks: ${enqueueResults.length}`);
  console.log('   ✅ Sample Enqueue Result:', enqueueResults[0]);

  // Assertions on Enqueue Results
  if (enqueueResults.length !== 10) throw new Error('Expected 10 enqueued task results');
  if (!enqueueResults[0].success) throw new Error('First task failed to enqueue');
  if (!enqueueResults[0].targetUrl.includes('/scheduler/publish-task')) {
    throw new Error(`Target URL does not match webhook: ${enqueueResults[0].targetUrl}`);
  }

  // 5. Test Queue Configuration Defaults
  console.log('\n4. Verifying Queue Settings & Retry Limits...');
  const queueSettings = cloudTasksService.getQueueSettings();
  console.log('   ✅ Queue Name:', queueSettings.queueName);
  console.log('   ✅ Rate Limits:', queueSettings.rateLimits);
  console.log('   ✅ Retry Config:', queueSettings.retryConfig);

  if (queueSettings.retryConfig.maxAttempts !== 5) throw new Error('maxAttempts should be 5');
  if (queueSettings.rateLimits.maxDispatchesPerSecond !== 50) throw new Error('maxDispatchesPerSecond should be 50');

  // 6. Test Webhook Execution (Simulating Cloud Task Trigger)
  console.log('\n5. Simulating Cloud Task HTTP Webhook Target Execution for Post #1...');
  const testPostId = postTasks[0].postId;
  const publishResult = await schedulerService.publishSinglePost(testPostId);

  console.log('   ✅ Webhook Publish Result:', publishResult);

  const updatedPost = await fbService.getScheduledPostById(testPostId);
  console.log('   ✅ Updated Firestore Post Status:', updatedPost.status);

  if (updatedPost.status !== 'PUBLISHED') {
    throw new Error(`Expected status PUBLISHED, got ${updatedPost.status}`);
  }

  console.log('\n🎉 ALL FIREBASE CLOUD TASKS QUEUING TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
