// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getAuth, 

  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getDatabase, 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// ================= Firebase Config =================
const firebaseConfig = {

    apiKey: "AIzaSyDFyGgCEgczLvQJNKcRAXZTHIXS2UDrBBQ",

    authDomain: "gas-monitoring-f725e.firebaseapp.com",

    databaseURL: "https://gas-monitoring-f725e-default-rtdb.firebaseio.com",

    projectId: "gas-monitoring-f725e",

    storageBucket: "gas-monitoring-f725e.firebasestorage.app",

    messagingSenderId: "409509342356",

    appId: "1:409509342356:web:2e1bbc7847a0162ab21881",

    measurementId: "G-RWJNP2S40P"

  };


// ================= Initialize Firebase =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


//// password reset
const resetBtn = document.getElementById("changepass");

resetBtn.addEventListener("click", () => {
  const user = auth.currentUser;

  if (!user) {
    alert("No user is logged in!");
    return;
  }

  const email = user.email; // Logged-in user's email

  sendPasswordResetEmail(auth, email)
    .then(() => {
      alert(`✅ Password reset email sent to ${email}`);
    })
    .catch((error) => {
      console.error(error);
      alert("❌ " + error.message);
    });
});