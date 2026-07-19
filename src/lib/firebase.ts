import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Supports both production environment variables (e.g. when exported to GitHub/Vercel)
// and sandbox hardcoded values for instant preview in AI Studio.
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAHSIw1Q9XjmIdHrl8CZ2VxAXm8nznTIrw",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0785609130.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0785609130",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0785609130.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "657621359896",
  appId: env.VITE_FIREBASE_APP_ID || "1:657621359896:web:ec4445432346825281926d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
// In AI Studio, we use a custom database ID. In standard/default setups, Firestore defaults to "(default)" or none.
const databaseId = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-pocket24-bf8e57b8-c523-46f6-aed7-08c0567c261f";

export const db = databaseId && databaseId !== "default" && databaseId !== "(default)"
  ? getFirestore(app, databaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


