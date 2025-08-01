import admin from 'firebase-admin';

// Check if the necessary environment variables are set.
const hasAdminConfig = 
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

// A robust way to initialize Firebase Admin SDK, especially for Next.js environments with hot-reloading.
if (hasAdminConfig && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.stack);
  }
}

// These are now guaranteed to be available if initialization was successful.
const adminDb = admin.apps.length ? admin.firestore() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

// Add a check to warn if the DB is not initialized, which is the root cause of all issues.
if (!adminDb) {
  console.warn(
    'Firebase Admin DB is not initialized. All Firestore operations will fail. ' +
    'Please check your .env.local file and restart the server.'
  );
}

export { adminDb, adminAuth };
