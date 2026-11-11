import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithCredential } from "firebase/auth";

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

// Développement local : `npm run emulators` puis `npm run dev:local` branchent
// l'application sur les émulateurs Firebase, sans jamais toucher à la production.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

const app = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-test' } : firebaseConfig);

// En production : la base nommée du projet. En local : la base par défaut de l'émulateur.
export const db = useEmulators
  ? getFirestore(app)
  : getFirestore(app, "ai-studio-gestiondestocket-c9302fd5-0dc6-42db-a023-5bfb1274d4f4");

export const auth = getAuth(app);

if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  // Connexion sans fenêtre Google, pour les essais : __devSignIn('awa@example.com')
  (window as any).__devSignIn = (email: string) =>
    signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: email.split('@')[0] })),
    );
}

// Initialize Analytics is disabled in the preview sandbox to prevent iframe crashes
export const analyticsPromise = Promise.resolve(null);

