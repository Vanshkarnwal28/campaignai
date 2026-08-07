require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const admin = require('firebase-admin');

const keepBusinessId = 'ab0a825d-b109-4078-8f65-f8f48149651f';
const keepEmails = new Set(['admin@campaignai.com', 'demo@campaignai.com']);
const businessScoped = new Set([
  'subscriptions', 'onboardingConversations', 'businessProfiles', 'notifications',
  'payments', 'businessBlueprints', 'contentStrategies', 'contentCalendar',
  'calendarHistory', 'metaAccounts', 'workspaces', 'social_posts',
  'scheduledPosts', 'campaignDrafts', 'activityLogs', 'campaigns',
]);

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('Firebase Admin configuration is incomplete.');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function ensureDemoUser() {
  let user;
  try {
    user = await admin.auth().getUserByEmail('demo@campaignai.com');
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await admin.auth().createUser({
      email: 'demo@campaignai.com',
      password: 'password123',
      displayName: 'CampaignAI Demo User',
    });
  }

  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    email: user.email,
    name: 'CampaignAI Demo User',
    role: 'MEMBER',
    preferredLanguage: 'English',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return user.uid;
}

async function commitDeletes(refs) {
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch();
    refs.slice(i, i + 450).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

async function main() {
  const demoUserId = await ensureDemoUser();
  const keepUserIds = new Set(['admin-user-id', demoUserId]);
  const deleteRefs = [];
  const deletedByCollection = {};

  const collections = await db.listCollections();
  for (const collection of collections) {
    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      let shouldDelete = false;

      if (collection.id === 'users') {
        shouldDelete = !keepEmails.has(String(data.email || '').toLowerCase()) && !keepUserIds.has(doc.id);
      } else if (collection.id === 'businesses') {
        shouldDelete = doc.id !== keepBusinessId;
      } else if (collection.id === 'workspaces') {
        shouldDelete = doc.id !== keepBusinessId && data.businessId !== keepBusinessId;
      } else if (businessScoped.has(collection.id)) {
        shouldDelete = data.businessId !== keepBusinessId;
      } else if (data.businessId) {
        shouldDelete = data.businessId !== keepBusinessId;
      } else if (data.userId) {
        shouldDelete = !keepUserIds.has(data.userId);
      }

      if (shouldDelete) {
        deleteRefs.push(doc.ref);
        deletedByCollection[collection.id] = (deletedByCollection[collection.id] || 0) + 1;
      }
    }
  }

  await commitDeletes(deleteRefs);
  const businessRef = db.collection('businesses').doc(keepBusinessId);
  await businessRef.set({ memberIds: [demoUserId], updatedAt: new Date().toISOString() }, { merge: true });

  console.log(JSON.stringify({
    keepBusinessId,
    demoUserId,
    deletedCount: deleteRefs.length,
    deletedByCollection,
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
