// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO FILL THIS IN:
//  1. Go to https://console.firebase.google.com/ and open your project.
//  2. Click the gear icon ⚙ → "Project settings" → "Your apps" → Web app (</>).
//  3. Copy each value from the firebaseConfig object shown there and paste below.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBqNP3Zpt370cbxDdBhFNSm4vRNwh44aIw",
  authDomain:        "auntys-vocal-classes.firebaseapp.com",
  projectId:         "auntys-vocal-classes",
  storageBucket:     "auntys-vocal-classes.firebasestorage.app",
  messagingSenderId: "532138992040",
  appId:             "1:532138992040:web:5a80baec5fdf1360c4fd9d",
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
