// app.js
import { db } from "./auth.js"; // Import the database instance from auth.js
import { ref, onValue, remove, get, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {


  const usersTableBody = document.getElementById('usersTableBody');

 

  // Modal elements
  const userModal = new bootstrap.Modal(document.getElementById('userModal'));
  const userDetailsEl = document.getElementById('userDetails');
  const cpuBar = document.getElementById('cpuBar');
  const memBar = document.getElementById('memBar');
  const btnKick = document.getElementById('btnKick');

  let allUsersData = []; 

  // --- 4. DATA LISTENERS ---

  // Listen for changes to the 'users' node
  onValue(ref(db, 'users'), (snapshot) => {
    if (!snapshot.exists()) {
      usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users in the database.</td></tr>';
      return;
    }
    
    const users = snapshot.val();
    allUsersData = Object.keys(users).map(key => ({ id: key, ...users[key] }));
    renderUsers(allUsersData);
  });

  // Listen for changes to the 'activityLog' node
  onValue(ref(db, 'activityLog'), (snapshot) => {
    activityLogEl.innerHTML = ''; 
    if (snapshot.exists()) {
        const logs = snapshot.val();
        // Use Object.values() and reverse() to get the latest logs first
        Object.values(logs).reverse().forEach(log => {
            const logEntry = document.createElement('div');
            // Ensure timestamp is treated as a number
            logEntry.innerHTML = `<strong>${new Date(log.timestamp).toLocaleTimeString()}</strong>: ${log.message}`;
            activityLogEl.prepend(logEntry);
        });
        activityLogEl.scrollTop = activityLogEl.scrollHeight;
    }
  });

  // --- 5. RENDER & UPDATE FUNCTIONS ---

  function renderUsers(usersArray) {
    usersTableBody.innerHTML = '';
    
    // Simplifed status logic: assume all users are offline as no status field exists in data
    let online = 0; 
    let offline = usersArray.length;

    if (usersArray.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found.</td></tr>';
    }

    usersArray.forEach(user => {
      const row = document.createElement('tr');
      row.className = 'user-row';
      row.innerHTML = `
        <td>
            <span class="status-dot status-offline"></span>
            ${user.firstName || 'N/A'} ${user.lastName || ''}
        </td>
        <td>${user.email || 'N/A'}</td>
        <td>${formatTimeAgo(user.createdAt)}</td>
        <td>N/A</td>
        <td>
            <button class="btn btn-sm btn-info view-details" data-uid="${user.id}">
                <i class="fa fa-info-circle"></i>
            </button>
        </td>
      `;
      usersTableBody.appendChild(row);
    });


  }

  // --- 6. EVENT HANDLERS ---
  
  usersTableBody.addEventListener('click', (e) => {
    const button = e.target.closest('.view-details');
    if (button) {
      const userId = button.dataset.uid;
      showUserDetails(userId);
    }
  });
  
  btnKick.addEventListener('click', () => {
    const userId = btnKick.dataset.uid;
    const userName = btnKick.dataset.name;
    if (confirm(`Are you sure you want to kick user ${userName}?`)) {
        // Modular SDK: use remove(ref(db, 'path'))
        remove(ref(db, 'users/' + userId))
          .then(() => {
              logActivity(`User ${userName} (${userId}) was kicked by admin.`);
              userModal.hide();
              alert('User kicked successfully.');
          })
          .catch(error => {
              console.error("Error kicking user: ", error);
              alert('Failed to kick user.');
          });
    }
  });


  // --- 7. HELPER FUNCTIONS ---

  function showUserDetails(userId) {
    // Modular SDK: use get(ref(db, 'path'))
    get(ref(db, 'users/' + userId)).then((snapshot) => {
      const user = snapshot.val();
      if (user) {
        userDetailsEl.innerHTML = `
          <p><strong>ID:</strong> ${userId}</p>
          <p><strong>Name:</strong> ${user.firstName || 'N/A'} ${user.lastName || ''}</p>
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>Role:</strong> ${user.role || 'N/A'}</p>
          <p><strong>Account Created:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
          <p><strong>Address:</strong> ${user.homeAddress || 'N/A'}</p>
        `;
        
        btnKick.dataset.uid = userId;
        btnKick.dataset.name = `${user.firstName || ''} ${user.lastName || ''}`;
        userModal.show();
      }
    });
  }
  


  function formatTimeAgo(isoString) {
      if(!isoString) return 'N/A';
      const date = new Date(isoString);
      const now = new Date();
      const seconds = Math.round(Math.abs((now - date) / 1000));
      
      const intervals = {
          year: 31536000,
          month: 2592000,
          week: 604800,
          day: 86400,
          hour: 3600,
          minute: 60
      };

      if (seconds < 60) return "just now";

      let counter;
      for (const i in intervals) {
          counter = Math.floor(seconds / intervals[i]);
          if (counter > 0) {
              return `${counter} ${i}${counter > 1 ? 's' : ''} ago`;
          }
      }
      return date.toLocaleTimeString();
  }
});