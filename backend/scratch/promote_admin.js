const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const userId = process.argv[2];
if (!userId) {
  console.error("Missing userId argument");
  process.exit(1);
}

if (admin.apps.length === 0) {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
      })
    });
  }
}

admin.firestore().collection('users').doc(userId).update({ role: 'ADMIN' })
  .then(() => {
    console.log('PROMOTED_ADMIN_SUCCESS');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
