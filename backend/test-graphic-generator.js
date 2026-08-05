require('dotenv').config();
const { FirebaseService } = require('./dist/src/firebase/firebase.service');
const { GraphicGeneratorService } = require('./dist/src/content/graphic-generator.service');
const { ContentService } = require('./dist/src/content/content.service');

async function runTest() {
  console.log('=== TESTING PROGRAMMATIC 1080x1080 GRAPHIC GENERATOR & FIREBASE STORAGE ===\n');

  // 1. Init services
  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const graphicGenerator = new GraphicGeneratorService();
  const contentService = new ContentService(fbService, null, null, null, graphicGenerator);

  // 2. Direct Canvas Buffer Test
  console.log('1. Testing GraphicGeneratorService (Rendering 1080x1080 PNG Buffer)...');
  const pngBuffer = await graphicGenerator.generateBrandedGraphicBuffer({
    businessName: 'Luxe Velvet Fashion House',
    offerText: 'EXCLUSIVE 40% OFF AUTUMN COLLECTION!',
    niche: 'Fashion & Luxury Apparel',
    vibe: 'Luxurious & Elite',
  });

  console.log('   ✅ Generated Canvas PNG Buffer Size:', pngBuffer.length, 'bytes');

  // Verify PNG header signature (0x89 0x50 0x4E 0x47)
  const isPng = pngBuffer[0] === 0x89 && pngBuffer[1] === 0x50 && pngBuffer[2] === 0x4e && pngBuffer[3] === 0x47;
  console.log('   ✅ Valid PNG Header Signature:', isPng ? 'VALID (0x89504E47)' : 'INVALID');

  if (!isPng) throw new Error('Buffer is not a valid PNG image');

  // 3. Test Firebase Storage Upload Service
  console.log('\n2. Testing Firebase Storage Upload...');
  const uploadResult = await fbService.uploadFileBuffer(
    pngBuffer,
    `graphics/test-workspace/${Date.now()}_test_graphic.png`,
    'image/png'
  );
  console.log('   ✅ Uploaded File Storage Path:', uploadResult.storagePath);
  console.log('   ✅ Public Download URL:', uploadResult.publicUrl);

  // 4. Test ContentService.generateBrandedGraphic()
  console.log('\n3. Testing ContentService.generateBrandedGraphic() via Firestore Context...');
  const user = await fbService.usersDao.create({ email: 'owner@cafe.com', name: 'Chef Mario' });
  const workspace = await fbService.workspacesDao.create({
    name: 'Artisanal Organic Bakery & Cafe',
    ownerId: user.id,
    niche: 'Food, Cafe & Hospitality',
    vibe: 'Eco-Friendly & Mindful',
  });
  await fbService.updateBusiness(workspace.id, {
    currentOffer: 'BUY 1 FRESH SOURDOUGH, GET 1 FREE CINNAMON ROLL!',
  });

  const fullResult = await contentService.generateBrandedGraphic(workspace.id);

  console.log('\n=== GENERATED BRANDED GRAPHIC RESULT ===');
  console.log('Business Name:', fullResult.businessName);
  console.log('Vibe:', fullResult.vibe);
  console.log('Dimensions:', fullResult.dimensions);
  console.log('Public Download URL:\n', fullResult.publicUrl);

  if (!fullResult.publicUrl || typeof fullResult.publicUrl !== 'string') {
    throw new Error('publicUrl must be a non-empty string');
  }

  console.log('\n🎉 ALL BRANDED GRAPHIC & FIREBASE STORAGE TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
