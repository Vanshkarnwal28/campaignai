require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const businessId = process.env.MIGRATE_BUSINESS_ID || 'ab0a825d-b109-4078-8f65-f8f48149651f';
const mockDbPath = path.join(process.cwd(), 'mock-db.json');

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
const localDb = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
const sensitiveKey = /(token|secret|password|privatekey|apikey|authorization)/i;

function stripCredentials(value) {
  if (Array.isArray(value)) return value.map(stripCredentials);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, nested]) => [key, stripCredentials(nested)]),
  );
}

async function main() {
  const batch = db.batch();
  let writes = 0;
  const migrated = [];

  for (const [collection, records] of Object.entries(localDb)) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) continue;
    if (collection === 'users') continue;

    for (const [id, rawRecord] of Object.entries(records)) {
      const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
      const belongsToBusiness = id === businessId || record.businessId === businessId || record.businessID === businessId;
      if (!belongsToBusiness) continue;

      const ref = db.collection(collection).doc(id);
      batch.set(ref, { ...stripCredentials(record), migratedFromLocalMock: true }, { merge: true });
      writes += 1;
      migrated.push(`${collection}/${id}`);

      if (writes === 450) {
        await batch.commit();
        writes = 0;
      }
    }
  }

  if (writes > 0) await batch.commit();
  console.log(JSON.stringify({ businessId, migratedCount: migrated.length, migrated }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
