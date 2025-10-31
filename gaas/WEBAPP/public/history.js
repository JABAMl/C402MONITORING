// history.js - Single table format for all records
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getFirestore, doc, setDoc, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

console.log("history.js is loading");

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const firestore = getFirestore(app);
console.log("Firebase initialized successfully");

class RTDBtoFirestoreLogger {
    constructor() {
        this.lastLogTimes = {};
        this.logInterval = 2 * 60 * 60 * 1000; // 2 hours
    }

    startListening() {
        console.log('Starting RTDB to Firestore logger...');
        
        // Listen to MQ6 sensor data
        const mq6Ref = ref(rtdb, 'sensors/mq6/kalman_value');
        onValue(mq6Ref, (snapshot) => {
            const mq6Value = snapshot.val();
            if (mq6Value !== null) {
                this.checkAndLogData('mq6', { kalman_value: mq6Value });
            }
        });
        
        // Listen to flow sensor data
        const flowRef = ref(rtdb, 'sensors/flow/flow_Rate');
        onValue(flowRef, (snapshot) => {
            const flowValue = snapshot.val();
            if (flowValue !== null) {
                this.checkAndLogData('flow', { flow_Rate: flowValue });
            }
        });
    }

    async checkAndLogData(sensorType, data) {
        const now = new Date();
        const lastLogTime = this.lastLogTimes[sensorType];
        
        if (!lastLogTime || (now - lastLogTime) >= this.logInterval) {
            await this.logToFirestore(sensorType, data);
            this.lastLogTimes[sensorType] = now;
            console.log(`Logged ${sensorType} data to Firestore`);
        }
    }

    async logToFirestore(sensorType, data) {
        try {
            const timestamp = new Date();
            const logData = {
                sensorType: sensorType,
                timestamp: timestamp,
                dateKey: this.getDateKey(timestamp),
                timeSlot: this.getTwoHourSlot(timestamp),
                ...data
            };
            
            const logId = `${sensorType}_${timestamp.getTime()}`;
            await setDoc(doc(firestore, 'sensorHistory', logId), logData);
            console.log(`Success: ${sensorType} data written to Firestore`);
            
        } catch (error) {
            console.error(`Error writing ${sensorType} data:`, error);
        }
    }

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    getTwoHourSlot(date) {
        const hours = date.getHours();
        return `${String(Math.floor(hours / 2) * 2).padStart(2, '0')}:00 - ${String(Math.floor(hours / 2) * 2 + 2).padStart(2, '0')}:00`;
    }
}

// Initialize logger
const logger = new RTDBtoFirestoreLogger();

// Function to get all historical data
async function getAllData() {
    try {
        const q = query(
            collection(firestore, 'sensorHistory'),
            orderBy('timestamp', 'desc') // Newest first
        );
        
        const querySnapshot = await getDocs(q);
        const logs = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
            });
        });
        
        console.log(`Found ${logs.length} total records`);
        return logs;
    } catch (error) {
        console.error('Error fetching all data:', error);
        return [];
    }
}

// Function to display data in single table
async function displayHistoryTable() {
    console.log('Displaying history table...');
    const logs = await getAllData();
    const container = document.getElementById('history-container');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No historical data found.
                <br><small>Data will appear here after the first 2-hour logging interval.</small>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="mb-0">Complete Sensor Data History</h4>
                        <small>Total Records: ${logs.length}</small>
                    </div>
                    <span class="badge bg-light text-primary">${logs.length} records</span>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-bordered table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Sensor</th>
                                <th>Kalman Value</th>
                                <th>Flow Rate (L/min)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString();
        const time = new Date(log.timestamp).toLocaleTimeString();
        const kalmanValue = log.kalman_value !== undefined ? log.kalman_value.toFixed(4) : '-';
        const flowRate = log.flow_Rate !== undefined ? log.flow_Rate.toFixed(2) : '-';
        const status = getStatusBadge(log.kalman_value, log.flow_Rate);
        const sensorBadge = getSensorBadge(log.sensorType);
        
        tableHTML += `
            <tr>
                <td>${date}</td>
                <td>${time}</td>
                <td>${sensorBadge}</td>
                <td>${kalmanValue}</td>
                <td>${flowRate}</td>
                <td>${status}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="card mt-4">
            <div class="card-header bg-secondary text-white">
                <h5 class="mb-0">Summary</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <strong>Total Records:</strong> ${logs.length}
                    </div>
                    <div class="col-md-3">
                        <strong>Date Range:</strong> ${new Date(logs[logs.length - 1].timestamp).toLocaleDateString()} - ${new Date(logs[0].timestamp).toLocaleDateString()}
                    </div>
                    <div class="col-md-3">
                        <strong>Last Update:</strong> ${new Date(logs[0].timestamp).toLocaleString()}
                    </div>
                    <div class="col-md-3">
                        <strong>MQ6 Records:</strong> ${logs.filter(log => log.sensorType === 'mq6').length}
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-3">
                        <strong>Flow Records:</strong> ${logs.filter(log => log.sensorType === 'flow').length}
                    </div>
                    <div class="col-md-9">
                        <strong>Data Period:</strong> ${getDataPeriod(logs)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// Helper functions
function getSensorBadge(sensorType) {
    if (sensorType === 'mq6') return '<span class="badge bg-warning">MQ6 Gas</span>';
    if (sensorType === 'flow') return '<span class="badge bg-info">Flow Sensor</span>';
    return `<span class="badge bg-secondary">${sensorType}</span>`;
}

function getStatusBadge(kalmanValue, flowRate) {
    if (kalmanValue !== undefined) {
        if (kalmanValue > 100) return '<span class="badge bg-danger">High</span>';
        if (kalmanValue > 50) return '<span class="badge bg-warning">Moderate</span>';
        return '<span class="badge bg-success">Normal</span>';
    }
    if (flowRate !== undefined) {
        if (flowRate > 10) return '<span class="badge bg-danger">High Flow</span>';
        if (flowRate > 5) return '<span class="badge bg-warning">Moderate</span>';
        return '<span class="badge bg-success">Normal</span>';
    }
    return '<span class="badge bg-secondary">-</span>';
}

function getDataPeriod(logs) {
    if (logs.length === 0) return 'No data';
    
    const firstDate = new Date(logs[logs.length - 1].timestamp);
    const lastDate = new Date(logs[0].timestamp);
    const diffTime = Math.abs(lastDate - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
}

// Refresh function
async function refreshHistory() {
    console.log('Refreshing history...');
    await displayHistoryTable();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing history page...');
    
    if (document.getElementById('history-container')) {
        logger.startListening();
        displayHistoryTable();
        
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshHistory);
        }
        
        // Auto-refresh every 5 minutes
        setInterval(refreshHistory, 5 * 60 * 1000);
    }
});