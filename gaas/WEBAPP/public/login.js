// login.js (fixed for modular SDK v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// Firebase config (same as register.html)
const firebaseConfig = {
    apiKey: "AIzaSyDpdFveLvas3jWDFHf47h5mGfWYFSL68Bg",
    authDomain: "gas-detection-ed9fd.firebaseapp.com",
    databaseURL: "https://gas-detection-ed9fd-default-rtdb.firebaseio.com",
    projectId: "gas-detection-ed9fd",
    storageBucket: "gas-detection-ed9fd.firebasestorage.app",
    messagingSenderId: "870213929902",
    appId: "1:870213929902:web:70b86218e90ae8a2ed563f",
    measurementId: "G-KVT8NY8CW0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Handle login button click
document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get role from Realtime DB
        const roleSnapshot = await get(ref(db, "users/" + user.uid + "/role"));
        if (roleSnapshot.exists()) {
            const role = roleSnapshot.val();
            if (role === "admin") {
                window.location.href = "admin.html";
            } else if (role === "user") {
                window.location.href = "dashboard.html"; // <- match your `index.html` if needed
            } else {
                alert("No role assigned. Contact support.");
                await signOut(auth);
            }
        } else {
            alert("User role not found. Contact support.");
            await signOut(auth);
        }
    } catch (error) {
        alert("Login failed: " + error.message);
    }



});



