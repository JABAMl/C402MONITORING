// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get 
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

// ================= Login =================
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user role from DB
      const roleSnap = await get(ref(db, "users/" + user.uid + "/role"));
      if (roleSnap.exists()) {
        const role = roleSnap.val();
        if (role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "index.html"; // dashboard
        }
      } else {
        alert("No role assigned. Contact support.");
        await signOut(auth);
      }
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

// ================= Logout =================
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// ================= Auth State Changes =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Logged in as:", user.email);

    // Fill Profile Page
    const emailEl = document.getElementById("profile-email");
    const nameEl = document.getElementById("profile-name");

    if (emailEl && nameEl) {
      emailEl.textContent = user.email;

      const snap = await get(ref(db, "users/" + user.uid));
      if (snap.exists()) {
        const data = snap.val();
        nameEl.textContent = `${data.firstName} ${data.lastName}`;
      } else {
        addressEl.textContent = "(No address)"
      }
    }

  } else {
    // If not logged in → redirect away from protected pages
    if (!window.location.pathname.includes("login.html") && 
        !window.location.pathname.includes("register.html")) {
      window.location.href = "login.html";
    }
  }
});



// Export for main.js or admin.js if needed
export { auth, db };


