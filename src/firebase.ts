import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Config provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDYb0apzMt88uazkG4uwQe5OsRFPjdtZW4",
  authDomain: "brand-ao-ef0f6.firebaseapp.com",
  databaseURL: "https://brand-ao-ef0f6-default-rtdb.firebaseio.com",
  projectId: "brand-ao-ef0f6",
  storageBucket: "brand-ao-ef0f6.firebasestorage.app",
  messagingSenderId: "439940497834",
  appId: "1:439940497834:web:26b076a98305d581fd2bd3",
  measurementId: "G-BL5PPVHPSQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the user's specific database ID
export const db = getFirestore(app, "ai-studio-gestiondestocket-c9302fd5-0dc6-42db-a023-5bfb1274d4f4");

// Export Authentication
export const auth = getAuth(app);

// Initialize Analytics is disabled in the preview sandbox to prevent iframe crashes
export const analyticsPromise = Promise.resolve(null);

