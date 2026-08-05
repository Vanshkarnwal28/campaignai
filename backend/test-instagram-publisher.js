require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { IntegrationsService } = require('./dist/src/integrations/integrations.service');
const { SchedulerService } = require('./dist/src/scheduler/scheduler.service');

async function runTest() {
  console.log('=== TESTING INSTAGRAM GRAPH API PUBLISHING LOOP & WORKER WEBHOOK ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const integrationsService = new IntegrationsService(fbService, null);
  const schedulerService = new SchedulerService(fbService, integrationsService);

  // 2. Setup user & workspace in Firestore
  console.log('1. Creating User & Workspace with Meta Credentials in Firestore...');
  const user = await fbService.usersDao.create({
    email: 'creator@luxefashion.com',
    name: 'Elena Luxe',
  });

  const workspace = await fbService.workspacesDao.create({
    name: 'Luxe Fashion House',
    ownerId: user.id,
    niche: 'Fashion & Luxury Apparel',
    vibe: 'Luxurious & Elite',
  });

  // Save Meta credentials to workspace and user profile
  await fbService.workspacesDao.update(workspace.id, {
    metaAccessToken: 'mock_long_lived_meta_access_token_60days',
    metaIgBusinessAccountId: '17841400012345678',
    metaPageId: '100123456789',
  });

  await fbService.usersDao.update(user.id, {
    metaAccessToken: 'mock_long_lived_meta_access_token_60days',
    metaIgBusinessAccountId: '17841400012345678',
  });

  console.log('   ✅ Workspace & User initialized with long-lived Meta Token and IG Account ID: 17841400012345678');

  // 3. Test direct 2-step Instagram Graph API method (publishInstagramPost)
  console.log('\n2. Testing 2-Step Instagram Container Upload & Publish (publishInstagramPost)...');
  const directResult = await integrationsService.publishInstagramPost(
    workspace.id,
    '✨ Unveiling Autumn Luxury Coats! #LuxeFashion #AutumnVibes',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
  );

  console.log('   ✅ Direct 2-Step Instagram Result:', directResult);
  if (!directResult.success) throw new Error('Direct Instagram publishing failed');
  if (!directResult.containerId) throw new Error('containerId missing from Step 1 /media');
  if (!directResult.instagramPostId) throw new Error('instagramPostId missing from Step 2 /media_publish');

  // 4. Create a scheduled post in Firestore
  console.log('\n3. Creating Scheduled Post in Firestore...');
  const post = await fbService.createScheduledPost({
    businessId: workspace.id,
    caption: 'Step into Autumn in pure elegance with our velvet collection! 🧣✨',
    hashtags: ['#LuxeFashion', '#VelvetCoats', '#AutumnCollection'],
    imageUrl: 'http://localhost:3001/uploads/1785433103556_branded_graphic.png',
    platform: 'Instagram',
    scheduledTime: new Date(),
    status: 'SCHEDULED',
  });

  console.log('   ✅ Created Scheduled Post ID:', post.id, '| Initial Status:', post.status);

  // 5. Simulate Worker Webhook Execution (Cloud Tasks POST /scheduler/publish-task)
  console.log('\n4. Executing Worker Webhook (publishSinglePost)...');
  const webhookResult = await schedulerService.publishSinglePost(post.id);

  console.log('   ✅ Webhook Worker Result:', webhookResult);

  // 6. Verify Firestore Post Status Update to 'PUBLISHED'
  console.log('\n5. Verifying Firestore Post Document Status...');
  const publishedPost = await fbService.getScheduledPostById(post.id);

  console.log('   ✅ Final Post Status:', publishedPost.status);
  console.log('   ✅ Published At:', publishedPost.publishedAt);
  console.log('   ✅ Publish Result Payload:', publishedPost.publishResult);

  if (publishedPost.status !== 'PUBLISHED') {
    throw new Error(`Expected status PUBLISHED, got ${publishedPost.status}`);
  }
  if (!publishedPost.publishedAt) {
    throw new Error('publishedAt timestamp was not set on post document');
  }

  // 7. Test Failure State Handling
  console.log('\n6. Testing API Failure State Handling...');
  const failPost = await fbService.createScheduledPost({
    businessId: 'non_existent_workspace_id',
    caption: 'Failure test post',
    platform: 'Instagram',
    scheduledTime: new Date(),
    status: 'SCHEDULED',
  });

  const failResult = await schedulerService.publishSinglePost(failPost.id);
  console.log('   ✅ Failure Webhook Result:', failResult);

  const updatedFailPost = await fbService.getScheduledPostById(failPost.id);
  console.log('   ✅ Failed Post Firestore Status:', updatedFailPost.status);

  if (updatedFailPost.status !== 'FAILED') {
    throw new Error(`Expected status FAILED for invalid workspace, got ${updatedFailPost.status}`);
  }

  console.log('\n🎉 ALL INSTAGRAM PUBLISHING & WORKER WEBHOOK TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
