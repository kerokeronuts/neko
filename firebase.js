import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkrR535m61AA1XkHxri6E5XEKxBAiGtYY",
  authDomain: "neko-bc24c.firebaseapp.com",
  projectId: "neko-bc24c",
  storageBucket: "neko-bc24c.firebasestorage.app",
  messagingSenderId: "1085974968005",
  appId: "1:1085974968005:web:6b1692d4b555688a85e2ac",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
