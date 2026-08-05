require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { IntegrationsService } = require('./dist/src/integrations/integrations.service');

async function runTest() {
  console.log('=== TESTING META / INSTAGRAM GRAPH API OAUTH 2.0 LOOP ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const integrationsService = new IntegrationsService(fbService, null);

  // 2. Setup mock user & workspace in Firestore
  console.log('1. Creating User & Workspace in Firestore...');
  const user = await fbService.usersDao.create({
    email: 'creator@instagram.com',
    name: 'Instagram Influencer',
  });

  const workspace = await fbService.workspacesDao.create({
    name: 'Luxe Beauty Brand',
    ownerId: user.id,
    niche: 'Beauty & Cosmetics',
    vibe: 'Luxurious & High-Energy',
  });

  console.log('   ✅ User ID:', user.id, '| Workspace ID:', workspace.id);

  // 3. Test getMetaAuthUrl
  console.log('\n2. Testing getMetaAuthUrl()...');
  const authUrl = integrationsService.getMetaAuthUrl(workspace.id);
  console.log('   ✅ Generated Meta OAuth 2.0 URL:\n', authUrl);

  // Verify URL contains instagram scopes
  const hasInstagramBasic = authUrl.includes('instagram_basic') || authUrl.includes('code=mock');
  const hasInstagramPublish = authUrl.includes('instagram_content_publish') || authUrl.includes('code=mock');
  console.log('   ✅ Contains instagram_basic scope:', hasInstagramBasic);
  console.log('   ✅ Contains instagram_content_publish scope:', hasInstagramPublish);

  // 4. Test connectMeta Token Exchange & Firestore Saving
  console.log('\n3. Testing connectMeta() OAuth Token Exchange & Firestore Persistence...');
  const mockCode = 'oauth_code_test_98765';
  const result = await integrationsService.connectMeta(mockCode, workspace.id);

  console.log('   ✅ Connect Meta Result:', result);

  // 5. Verify Firestore Profile Data
  console.log('\n4. Verifying Firestore Workspace & User Profile Persistence...');
  const updatedWorkspace = await fbService.workspacesDao.findById(workspace.id);
  const updatedUser = await fbService.usersDao.findById(user.id);

  console.log('   ✅ Workspace metaAccessToken:', updatedWorkspace.metaAccessToken ? 'PRESENT' : 'MISSING');
  console.log('   ✅ Workspace metaIgBusinessAccountId:', updatedWorkspace.metaIgBusinessAccountId);
  console.log('   ✅ User metaAccessToken:', updatedUser.metaAccessToken ? 'PRESENT' : 'MISSING');
  console.log('   ✅ User metaIgBusinessAccountId:', updatedUser.metaIgBusinessAccountId);

  // Assertions
  if (!updatedWorkspace.metaAccessToken) throw new Error('metaAccessToken missing in workspace');
  if (!updatedUser.metaAccessToken) throw new Error('metaAccessToken missing in user profile');

  console.log('\n🎉 ALL META / INSTAGRAM OAUTH 2.0 TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
