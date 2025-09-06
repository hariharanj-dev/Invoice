// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnt-HRZ96l8L2NSVF5x2dyrdMKaouBo4E",
  authDomain: "invoice-8ff3d.firebaseapp.com",
  projectId: "invoice-8ff3d",
  storageBucket: "invoice-8ff3d.firebasestorage.app",
  messagingSenderId: "429434497748",
  appId: "1:429434497748:web:55a293d90ec66c1c5ce941",
  measurementId: "G-02EPHNT9TN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);