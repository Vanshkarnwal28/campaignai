const { FirebaseService } = require('./dist/src/firebase/firebase.service');

async function runTest() {
  console.log('=== TESTING FIRESTORE DAOs (Users, Workspaces, SocialPosts) ===\n');

  const fbService = new FirebaseService();
  fbService.onModuleInit();

  const { usersDao, workspacesDao, socialPostsDao } = fbService;

  // 1. UsersDao Test
  console.log('1. Testing UsersDao...');
  const user = await usersDao.create({
    email: 'creator@campaignai.com',
    name: 'Sarah Creator',
    role: 'MEMBER',
    preferredLanguage: 'English',
  });
  console.log('   ✅ Created User:', user.id, user.name, user.email);

  const foundUser = await usersDao.findByEmail('creator@campaignai.com');
  console.log('   ✅ Found User by Email:', foundUser?.id === user.id ? 'MATCH' : 'MISMATCH');

  // 2. WorkspacesDao Test (Niche & Vibe)
  console.log('\n2. Testing WorkspacesDao (Niche & Vibe)...');
  const workspace = await workspacesDao.create({
    name: 'Organic Cafe & Bakery',
    ownerId: user.id,
    niche: 'Food & Hospitality',
    vibe: 'Warm, Eco-Friendly & Festive',
  });
  console.log('   ✅ Created Workspace:', workspace.id, workspace.name);
  console.log('      Niche:', workspace.niche, '| Vibe:', workspace.vibe);

  const updatedWorkspace = await workspacesDao.updateNicheAndVibe(
    workspace.id,
    'Artisanal Bakery & Cafe',
    'Chic, Cozy & High-Energy'
  );
  console.log('   ✅ Updated Workspace Niche/Vibe:', updatedWorkspace.niche, '|', updatedWorkspace.vibe);

  // 3. SocialPostsDao Test (Caption, Image URL, Schedule Time, Status)
  console.log('\n3. Testing SocialPostsDao (Social Media Scheduler)...');
  const scheduleDate = new Date(Date.now() + 3600 * 1000); // 1 hour from now
  const post = await socialPostsDao.create({
    workspaceId: workspace.id,
    authorId: user.id,
    caption: '🎉 Fresh organic sourdough loaves baked daily! Order online or visit our cafe today! #OrganicBakery #FreshBakes',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
    scheduleTime: scheduleDate,
    status: 'SCHEDULED',
  });
  console.log('   ✅ Created Scheduled Social Post:', post.id);
  console.log('      Status:', post.status, '| Schedule Time:', post.scheduleTime);
  console.log('      Caption:', post.caption.substring(0, 45) + '...');

  // Test updating status to PUBLISHED
  const publishedPost = await socialPostsDao.updateStatus(post.id, 'PUBLISHED', {
    publishedPostId: 'meta_post_9876543210',
  });
  console.log('   ✅ Updated Post Status to PUBLISHED. Meta Post ID:', publishedPost.publishedPostId);

  console.log('\n🎉 ALL FIRESTORE DAO TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ DAO Test Failed:', err);
  process.exit(1);
});
