// public/login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDnt-HRZ96l8L2NSVF5x2dyrdMKaouBo4E",
  authDomain: "invoice-8ff3d.firebaseapp.com",
  projectId: "invoice-8ff3d",
  storageBucket: "invoice-8ff3d.firebasestorage.app",
  messagingSenderId: "429434497748",
  appId: "1:429434497748:web:55a293d90ec66c1c5ce941",
  measurementId: "G-02EPHNT9TN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("User UID:", user.uid);
    alert(`Welcome! UID: ${user.email}`);

    // Redirect to invoice home page
    window.location.href = "index.html";
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});
