import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHSIw1Q9XjmIdHrl8CZ2VxAXm8nznTIrw",
  authDomain: "gen-lang-client-0785609130.firebaseapp.com",
  projectId: "gen-lang-client-0785609130",
  storageBucket: "gen-lang-client-0785609130.firebasestorage.app",
  messagingSenderId: "657621359896",
  appId: "1:657621359896:web:ec4445432346825281926d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom databaseId
const databaseId = "ai-studio-pocket24-bf8e57b8-c523-46f6-aed7-08c0567c261f";
export const db = getFirestore(app, databaseId);
