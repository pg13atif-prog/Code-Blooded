// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbZdfq2rYGjh2_98KlM9vBXHvDOzaBL8c",
  authDomain: "cinescope-app.firebaseapp.com",
  databaseURL: "https://cinescope-app-default-rtdb.firebaseio.com",
  projectId: "cinescope-app",
  storageBucket: "cinescope-app.firebasestorage.app",
  messagingSenderId: "335969845291",
  appId: "1:335969845291:web:e7302e848ef978cf026a6e",
  measurementId: "G-JFGS8505YT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;
