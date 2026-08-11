// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration read from environment variables or fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbZdfq2rYGjh2_98KlM9vBXHvDOzaBL8c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cinescope-app.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://cinescope-app-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cinescope-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cinescope-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "335969845291",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:335969845291:web:e7302e848ef978cf026a6e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JFGS8505YT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;
