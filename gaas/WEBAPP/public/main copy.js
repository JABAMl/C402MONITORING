// main.js
import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { auth, db } from "./auth.js";


// ================= DOM Elements =================
const gasValueEl = document.getElementById("gas-value");
const gasStatusEl = document.getElementById("gas-status");
const flowValueEl = document.getElementById("flow-value");
const flowStatusEl = document.getElementById("flow-status");
const eventLogEl = document.getElementById("event-log");
const alertsContainerEl = document.getElementById("alerts-container");

// Threshold modal elements
const flowThresholdInput = document.getElementById("flow-threshold");
const gasThresholdInput = document.getElementById("gas-threshold");
const highGasThresholdInput = document.getElementById("high-gas-threshold");
const anomalyThresholdInput = document.getElementById("anomaly-threshold");
const saveSettingsBtn = document.getElementById("save-settings");

// Current threshold display elements
const currentFlowThresholdEl = document.getElementById("current-flow-threshold-display");
const currentGasThresholdEl = document.getElementById("current-gas-threshold-display");
const currentHighGasThresholdEl = document.getElementById("current-high-gas-threshold-display");
const currentAnomalyThresholdEl = document.getElementById("current-anomaly-threshold-display");

// System status elements
const valveStatusEl = document.getElementById("valve-status");
const fanStatusEl = document.getElementById("fan-status");
const buzzerStatusEl = document.getElementById("buzzer-status");
const anomalyStatusEl = document.getElementById("anomaly-status");

// Chart elements
let combinedChart;
let lastLogTime = 0;

// ================= Charts =================
function initializeCharts() {
  const chartCtx = document.getElementById('combinedChart');
  
  if (!chartCtx) {
    console.error('Chart canvas element not found');
    return;
  }
  
  combinedChart = new Chart(chartCtx.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Gas Level (ppm)',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Flow Rate (L/min)',
          data: [],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Gas (ppm)'
          },
          suggestedMin: 0,
          suggestedMax: 1000
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Flow (L/min)'
          },
          suggestedMin: 0,
          suggestedMax: 10,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// ================= Alert Modal =================
let alertModalInstance;

function showAlertModal(message, type = 'danger') {
  const modalBody = document.getElementById("alertModalBody");
  if (modalBody) {
    modalBody.innerHTML = `<span class="text-${type}">${message}</span>`;
  }
  const modalEl = document.getElementById("alertModal");
  if (modalEl) {
    if (!alertModalInstance) {
      alertModalInstance = new bootstrap.Modal(modalEl);
    }
    alertModalInstance.show();
  }
}

function addAlert(message, type = 'danger') {
  const alertsContainer = document.getElementById("alerts-container");
  if (!alertsContainer) return;

  const alertEl = document.createElement("div");
  alertEl.className = `alert alert-${type} d-flex justify-content-between align-items-center`;
  alertEl.innerHTML = `
    <span>${new Date().toLocaleTimeString()} - ${message}</span>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  if (alertsContainer.firstElementChild?.classList.contains("alert-info")) {
    alertsContainer.innerHTML = "";
  }

  alertsContainer.prepend(alertEl);

  setTimeout(() => {
    if (alertEl && alertEl.parentElement) {
      alertEl.remove();
      if (!alertsContainer.hasChildNodes()) {
        alertsContainer.innerHTML = `<div class="alert alert-info">No active alerts</div>`;
      }
    }
  }, 2 * 60 * 60 * 1000);
}

// ================= Real-time Monitoring =================
function startRealTimeMonitoring() {
  // Gas
  const gasRef = ref(db, 'sensors/mq6');
  onValue(gasRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateGasDisplay(data);
      updateChart('gas', data.kalman_value || data.raw_value);
      addEventLog(`Gas: ${(data.kalman_value || data.raw_value).toFixed(2)} ppm - ${data.status}`);
    }
  });

  // Flow
  const flowRef = ref(db, 'sensors/flow');
  onValue(flowRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateFlowDisplay(data);
      updateChart('flow', data.value);
      addEventLog(`Flow: ${data.value.toFixed(2)} L/min`);
    }
  });

  // Actuators
  const valveRef = ref(db, 'actuators/valve');
  onValue(valveRef, (snapshot) => {
    const status = snapshot.val();
    updateValveStatus(status);
    addEventLog(status ? "Valve CLOSED" : "Valve OPEN");
  });

  const fanRef = ref(db, 'actuators/fan');
  onValue(fanRef, (snapshot) => {
    const status = snapshot.val();
    updateFanStatus(status);
    if (status) addEventLog("Fan activated");
  });

  const buzzerRef = ref(db, 'actuators/buzzer');
  onValue(buzzerRef, (snapshot) => {
    const status = snapshot.val();
    updateBuzzerStatus(status);
    if (status) {
      addEventLog("Buzzer activated");
      showAlertModal("Buzzer activated - Emergency alert!", 'danger');
    }
  });

  monitorCurrentThresholds();
}

// ================= Display Updates =================
function updateGasDisplay(data) {
  if (gasValueEl) {
    const value = data.kalman_value ? data.kalman_value.toFixed(2) : data.raw_value;
    gasValueEl.textContent = value;

    if (data.status === 'DANGER') {
      gasValueEl.style.color = '#dc3545';
      showAlertModal(`Dangerous gas level detected: ${value} ppm!`, 'danger');
      addAlert(`Dangerous gas level detected: ${value} ppm!`, 'danger');
    } else if (data.status === 'WARNING') {
      gasValueEl.style.color = '#ffc107';
      showAlertModal(`Warning: Gas level high at ${value} ppm`, 'warning');
      addAlert(`Warning: Gas level high at ${value} ppm`, 'warning');
    }
  }

  if (gasStatusEl) {
    gasStatusEl.textContent = data.status || 'NORMAL';
    gasStatusEl.className = `badge bg-${getStatusClass(data.status || 'NORMAL')}`;
  }

  if (anomalyStatusEl) {
    anomalyStatusEl.textContent = data.anomaly ? 'DETECTED' : 'NORMAL';
    anomalyStatusEl.className = `badge bg-${data.anomaly ? 'danger' : 'success'}`;
  }
}

function updateFlowDisplay(data) {
  if (flowValueEl) {
    const value = data.value ? data.value.toFixed(2) : '0.00';
    flowValueEl.textContent = value;

    const flowThreshold = parseFloat(currentFlowThresholdEl?.textContent.split(' ')[0]) || 5.0;
    if (parseFloat(value) > flowThreshold) {
      flowValueEl.style.color = '#dc3545';
      flowStatusEl.textContent = 'HIGH';
      flowStatusEl.className = 'badge bg-danger';
      showAlertModal(`High flow rate detected: ${value} L/min`, 'warning');
      addAlert(`High flow rate detected: ${value} L/min`, 'warning');
    }
  }
}

function updateValveStatus(status) {
  if (valveStatusEl) {
    valveStatusEl.textContent = status ? 'CLOSED' : 'OPEN';
    valveStatusEl.className = `badge bg-${status ? 'danger' : 'success'}`;
  }
}

function updateFanStatus(status) {
  if (fanStatusEl) {
    fanStatusEl.textContent = status ? 'ON' : 'OFF';
    fanStatusEl.className = `badge bg-${status ? 'warning' : 'secondary'}`;
  }
}

function updateBuzzerStatus(status) {
  if (buzzerStatusEl) {
    buzzerStatusEl.textContent = status ? 'ACTIVE' : 'OFF';
    buzzerStatusEl.className = `badge bg-${status ? 'danger' : 'secondary'}`;
  }
}

function getStatusClass(status) {
  switch (status.toUpperCase()) {
    case 'DANGER': return 'danger';
    case 'WARNING': return 'warning';
    case 'NORMAL': return 'success';
    default: return 'info';
  }
}

// ================= Thresholds =================
function monitorCurrentThresholds() {
  const thresholdsRef = ref(db, 'settings');
  onValue(thresholdsRef, (snapshot) => {
    const thresholds = snapshot.val();
    if (thresholds) {
      updateThresholdDisplay(thresholds);
      populateThresholdInputs(thresholds);
    }
  });
}

function updateThresholdDisplay(thresholds) {
  currentFlowThresholdEl.textContent = `${thresholds.flow_threshold ?? 5.0} L/min`;
  currentGasThresholdEl.textContent = `${thresholds.gas_threshold ?? 200} ppm`;
  currentHighGasThresholdEl.textContent = `${thresholds.high_gas_threshold ?? 400} ppm`;
  currentAnomalyThresholdEl.textContent = `${thresholds.anomaly_threshold ?? 3.0}`;
}

function populateThresholdInputs(thresholds) {
  flowThresholdInput.value = thresholds.flow_threshold ?? 5.0;
  gasThresholdInput.value = thresholds.gas_threshold ?? 200;
  highGasThresholdInput.value = thresholds.high_gas_threshold ?? 400;
  anomalyThresholdInput.value = thresholds.anomaly_threshold ?? 3.0;
}

// ================= Save Settings =================
function setupSaveSettings() {
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      try {
        const newSettings = {
          flow_threshold: parseFloat(flowThresholdInput.value),
          gas_threshold: parseInt(gasThresholdInput.value),
          high_gas_threshold: parseInt(highGasThresholdInput.value),
          anomaly_threshold: parseFloat(anomalyThresholdInput.value)
        };

        if (newSettings.gas_threshold >= newSettings.high_gas_threshold) {
          alert('Gas warning threshold must be lower than danger threshold!');
          return;
        }

        await set(ref(db, 'settings'), newSettings);

        const modal = bootstrap.Modal.getInstance(document.getElementById('thresholdModal'));
        modal.hide();

        addEventLog(`Thresholds updated: Flow=${newSettings.flow_threshold}, Gas=${newSettings.gas_threshold}/${newSettings.high_gas_threshold}`);
        alert('Settings saved successfully!');
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
      }
    });
  }
}

// ================= Logs =================
function addEventLog(message) {
  const now = Date.now();

  // only allow logging if 2 seconds have passed (for testing, changed from 2 hours)
  if (now - lastLogTime < 60000) {
    return;
  }
  lastLogTime = now;

  if (!eventLogEl) return;

  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
    <span>${message}</span>
  `;

  eventLogEl.prepend(logEntry);

  if (eventLogEl.children.length > 10) {
    eventLogEl.lastChild.remove();
  }
}

// ================= Chart Update =================
function updateChart(dataset, value) {
  if (!combinedChart) return;

  const timeLabel = new Date().toLocaleTimeString();
  
  // Add new time label if it doesn't exist
  if (combinedChart.data.labels.length === 0 || 
      combinedChart.data.labels[combinedChart.data.labels.length - 1] !== timeLabel) {
    combinedChart.data.labels.push(timeLabel);
  }
  
  // Update the appropriate dataset
  if (dataset === 'gas') {
    combinedChart.data.datasets[0].data.push(value);
  } else if (dataset === 'flow') {
    combinedChart.data.datasets[1].data.push(value);
  }
  
  // Keep only the last 20 data points
  if (combinedChart.data.labels.length > 20) {
    combinedChart.data.labels.shift();
    combinedChart.data.datasets[0].data.shift();
    combinedChart.data.datasets[1].data.shift();
  }
  
  combinedChart.update('active');
}

// ================= Init =================
document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Initialize charts after a small delay to ensure DOM is loaded
      setTimeout(() => {
        initializeCharts();
        startRealTimeMonitoring();
        setupSaveSettings();
        addEventLog('System initialized');
      }, 100);
    } else {
      console.log('User not authenticated');
    }
  });
});