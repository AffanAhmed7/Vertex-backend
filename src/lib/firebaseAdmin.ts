import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || 'vertex--e-commerce';

function getFirebaseCredential() {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
        try {
            return cert(JSON.parse(json));
        } catch {
            // Fall back to ADC if JSON is invalid; request will fail later if creds are missing
            return applicationDefault();
        }
    }
    return applicationDefault();
}

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        projectId,
        credential: getFirebaseCredential(),
    });
}

export const firebaseAdmin = getAuth();
