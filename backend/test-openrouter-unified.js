require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { AiService } = require('./dist/src/ai/ai.service');
const { ContentService } = require('./dist/src/content/content.service');

async function runTest() {
  console.log('=== TESTING OPENROUTER UNIFIED INTEGRATION (Gemini Text + Image Gen) ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const aiService = new AiService();
  const contentService = new ContentService(fbService, aiService, null, null);

  // 2. Create mock workspace in Firestore
  console.log('1. Setting up Workspace in Firestore...');
  const user = await fbService.usersDao.create({
    email: 'boutique@fashionluxe.com',
    name: 'Elena Fashion',
  });

  const workspace = await fbService.workspacesDao.create({
    name: 'Luxe Velvet Fashion House',
    ownerId: user.id,
    niche: 'Fashion & Apparel',
    vibe: 'Luxurious, Elegant & Chic',
  });

  await fbService.updateBusiness(workspace.id, {
    currentOffer: 'EXCLUSIVE 40% OFF AUTUMN LUXURY COLLECTION',
    targetAudience: 'Fashion-forward women aged 22-45',
  });

  console.log('   ✅ Workspace created:', workspace.id, '| Niche:', workspace.niche, '| Vibe:', workspace.vibe);

  // 3. Test generateInstagramPost via OpenRouter
  console.log('\n2. Generating Instagram Post & AI Image via OpenRouter...');
  const result = await contentService.generateInstagramPost(workspace.id, 'Autumn Velvet Coats Collection Launch');

  console.log('\n=== OPENROUTER GENERATED INSTAGRAM POST ===');
  console.log('Caption:\n' + result.caption);
  console.log('\nHashtags Count:', result.hashtags.length);
  console.log('Hashtags:\n', result.hashtags.slice(0, 5).join(' '), '...');
  console.log('\nGenerated AI Image URL:\n', result.imageUrl);
  console.log('AI Image Model:', result.imageModel);
  console.log('Firestore Post Draft ID:', result.postId);

  // 4. Test direct generateImage via OpenRouter
  console.log('\n3. Testing direct OpenRouter generateImage()...');
  const imageGen = await aiService.generateImage('Modern luxury retail store storefront with neon lights at dusk');
  console.log('   ✅ Direct Image URL:', imageGen.imageUrl);
  console.log('   ✅ Direct Model Used:', imageGen.model);

  // Assertions
  if (!result.caption || typeof result.caption !== 'string') {
    throw new Error('Caption must be a non-empty string');
  }
  if (!Array.isArray(result.hashtags) || result.hashtags.length !== 15) {
    throw new Error(`Expected 15 hashtags, got ${result.hashtags.length}`);
  }
  if (!result.imageUrl || typeof result.imageUrl !== 'string') {
    throw new Error('imageUrl must be a non-empty string');
  }

  console.log('\n🎉 ALL OPENROUTER UNIFIED GENERATION TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
