// /js/admin.js

let currentUser = null;

// Chart setup
const ctx = document.getElementById('globalChart').getContext('2d');
const globalChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Average Gas Level',
            data: [],
            borderColor: 'red',
            fill: false
        }]
    },
    options: { responsive: true }
});

// Auth check
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        // Optional: Check if this user is actually an admin in Firebase
        loadAllUsersLiveData();
        loadAllLogs();
    }
});

// Listen to all users' live gas readings
function loadAllUsersLiveData() {
    db.ref("users").on("value", snapshot => {
        const tableBody = document.getElementById("liveTable");
        tableBody.innerHTML = "";
        let totalGas = 0;
        let count = 0;

        snapshot.forEach(userSnap => {
            const userId = userSnap.key;
            const threshold = userSnap.val().threshold || 300;

            db.ref("devices/" + userId + "/live").once("value", liveSnap => {
                const gasValue = liveSnap.val() || 0;
                totalGas += gasValue;
                count++;

                let status = "Normal";
                let badgeClass = "bg-success";
                if (gasValue >= threshold && gasValue < threshold * 1.5) {
                    status = "Medium";
                    badgeClass = "bg-warning";
                } else if (gasValue >= threshold * 1.5) {
                    status = "Warning";
                    badgeClass = "bg-danger";
                }

                tableBody.insertAdjacentHTML("beforeend", `
                    <tr>
                        <td>${userId}</td>
                        <td>${gasValue}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                        <td>${threshold}</td>
                    </tr>
                `);

                // Update chart
                if (count === snapshot.numChildren()) {
                    const avgGas = totalGas / count;
                    const time = new Date().toLocaleTimeString();
                    globalChart.data.labels.push(time);
                    globalChart.data.datasets[0].data.push(avgGas);
                    if (globalChart.data.labels.length > 20) {
                        globalChart.data.labels.shift();
                        globalChart.data.datasets[0].data.shift();
                    }
                    globalChart.update();
                }
            });
        });
    });
}

// Load all logs
function loadAllLogs() {
    db.ref("logs").limitToLast(50).on("child_added", snapshot => {
        const log = snapshot.val();
        const row = `<tr>
            <td>${log.user}</td>
            <td>${log.time}</td>
            <td>${log.level}</td>
            <td>${log.status}</td>
        </tr>`;
        document.getElementById("logTable").insertAdjacentHTML('afterbegin', row);
    });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut();
});
