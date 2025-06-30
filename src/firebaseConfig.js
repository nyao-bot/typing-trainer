import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoQCn7XWIMpAF3iL0TrcVsCzcFu2z1mYU",
  authDomain: "typing-ranking.firebaseapp.com",
  projectId: "typing-ranking",
  storageBucket: "typing-ranking.firebasestorage.app",
  messagingSenderId: "666230994649",
  appId: "1:666230994649:web:2b013e6257993aabdeb0c8",
  measurementId: "G-16GQY6RX50",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
