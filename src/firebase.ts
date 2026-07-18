import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

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

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics conditionally to prevent crashes inside preview iframe sandboxes
export const analyticsPromise = typeof window !== 'undefined'
  ? isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null)
  : Promise.resolve(null);
