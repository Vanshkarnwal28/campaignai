require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { AiService } = require('./dist/src/ai/ai.service');
const { ContentService } = require('./dist/src/content/content.service');

async function runTest() {
  console.log('=== TESTING GEMINI INSTAGRAM TEXT GENERATION ENDPOINT ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const aiService = new AiService();
  const contentService = new ContentService(fbService, aiService, null, null);

  // 2. Create mock user & workspace with Niche, Vibe, and Offer
  console.log('1. Creating test Workspace in Firestore with Niche, Vibe & Offer...');
  const user = await fbService.usersDao.create({
    email: 'baker@artisanbread.com',
    name: 'Marco Baker',
  });

  const workspace = await fbService.workspacesDao.create({
    name: 'Artisan Sourdough Bakery',
    ownerId: user.id,
    niche: 'Food, Cafe & Bakery',
    vibe: 'Warm, Festive & Mouth-Watering',
  });

  await fbService.updateBusiness(workspace.id, {
    currentOffer: 'BUY 1 SOURDOUGH, GET 1 FREE CINNAMON ROLL TODAY ONLY!',
    targetAudience: 'Food lovers, coffee enthusiasts & local foodies',
  });

  console.log('   ✅ Workspace created:', workspace.id, '| Niche:', workspace.niche, '| Vibe:', workspace.vibe);

  // 3. Test generateInstagramPost Endpoint
  console.log('\n2. Calling generateInstagramPost (pulling context from Firestore)...');
  const result = await contentService.generateInstagramPost(workspace.id, 'Weekend Morning Pastries');

  console.log('\n=== GENERATED INSTAGRAM CONTENT ===');
  console.log('Caption:\n' + result.caption);
  console.log('\nHashtags Count:', result.hashtags.length);
  console.log('Hashtags Array:\n', result.hashtags);
  console.log('Firestore Post Draft ID:', result.postId);

  // 4. Assertions
  if (!result.caption || typeof result.caption !== 'string') {
    throw new Error('Caption must be a non-empty string');
  }
  if (!Array.isArray(result.hashtags) || result.hashtags.length !== 15) {
    throw new Error(`Expected exactly 15 hashtags, got ${result.hashtags.length}`);
  }
  if (!result.hashtags.every((t) => t.startsWith('#'))) {
    throw new Error('All hashtags must start with #');
  }

  console.log('\n🎉 ALL GEMINI INSTAGRAM ENDPOINT TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
