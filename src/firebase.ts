import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize app once (safe on server)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Only create Firestore/Auth/Storage in the browser to avoid IndexedDB errors during SSR
const db = typeof window !== "undefined" ? getFirestore(app) : null;
const auth = typeof window !== "undefined" ? getAuth(app) : null;
const storage = typeof window !== "undefined" ? getStorage(app) : null;

export { app, db, auth, storage };
