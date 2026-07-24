import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId and appId are optional for auth — only needed for FCM push notifications
  ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID && {
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }),
  ...(import.meta.env.VITE_FIREBASE_APP_ID && {
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }),
};

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let isConfigured = false;

// Only apiKey + projectId are required for Firebase Auth to work
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== '<your-api-key>' && firebaseConfig.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    isConfigured = true;
    console.log(`[Firebase] Initialized for project: ${firebaseConfig.projectId}`);
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err);
  }
} else {
  console.error(
    '[Firebase] CRITICAL: Firebase config is missing. Add real values to frontend/.env.\n' +
    'Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_AUTH_DOMAIN'
  );
}

export function getFirebaseInstances() {
  return { app, auth, googleProvider, isConfigured };
}

export { auth, googleProvider, isConfigured };
