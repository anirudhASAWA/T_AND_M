// Main application state
const state = {
  processes: [],
  timers: {},
  timerIntervals: {},
  editMode: false,
  editProcessIndex: null,
  activeProcess: null,
  activeSubprocess: null
};

// DOM Elements
const processInput = document.getElementById('processInput');
const addProcessBtn = document.getElementById('addProcessBtn');
const updateProcessBtn = document.getElementById('updateProcessBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const processTableContainer = document.getElementById('processTableContainer');
const processTableBody = document.getElementById('processTableBody');
const recordedTimesContainer = document.getElementById('recordedTimesContainer');
const recordedTimesTableBody = document.getElementById('recordedTimesTableBody');
const exportBtn = document.getElementById('exportBtn');

// Format time in hh:mm:ss format
function formatTime(time) {
  // Ensure time is a positive value
  time = Math.abs(time);
  
  const hours = Math.floor(time / 3600000);
  const minutes = Math.floor((time % 3600000) / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format date and time for display
function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Add a new process
function addProcess() {
  const processName = processInput.value.trim();
  if (!processName) return;
  
  const newProcess = {
    name: processName,
    subprocesses: [],
    active: false,
    timerRunning: false,
    elapsedTime: 0,
    startTime: null,
    lastLapTime: 0,
    readings: []
  };
  
  state.processes.push(newProcess);
  processInput.value = '';
  
  renderProcesses();
  processTableContainer.style.display = 'block';
}

// Start edit process
function startEditProcess(index) {
  state.editMode = true;
  state.editProcessIndex = index;
  processInput.value = state.processes[index].name;
  addProcessBtn.style.display = 'none';
  updateProcessBtn.style.display = 'inline-block';
  cancelEditBtn.style.display = 'inline-block';
}

// Save edited process
function saveEditProcess() {
  const processName = processInput.value.trim();
  if (!processName) return;
  
  state.processes[state.editProcessIndex].name = processName;
  
  processInput.value = '';
  addProcessBtn.style.display = 'inline-block';
  updateProcessBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  state.editMode = false;
  state.editProcessIndex = null;
  
  renderProcesses();
}

// Cancel edit
function cancelEdit() {
  processInput.value = '';
  addProcessBtn.style.display = 'inline-block';
  updateProcessBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  state.editMode = false;
  state.editProcessIndex = null;
}

// Delete a process
function deleteProcess(index) {
  const process = state.processes[index];
  
  // Clear any running timers
  if (state.timerIntervals[process.name]) {
    clearInterval(state.timerIntervals[process.name]);
    delete state.timerIntervals[process.name];
  }
  
  // Remove process
  state.processes.splice(index, 1);
  
  // Clean up timer state
  delete state.timers[process.name];
  
  renderProcesses();
  renderRecordedTimes();
  
  if (state.processes.length === 0) {
    processTableContainer.style.display = 'none';
  }
}

// Add a subprocess to a process
function addSubprocess(processIndex) {
  const subprocessInputId = `subprocess-input-${processIndex}`;
  const subprocessInput = document.getElementById(subprocessInputId);
  const subprocessName = subprocessInput.value.trim();
  
  if (!subprocessName) return;
  
  const process = state.processes[processIndex];
  
  // Mark the current active subprocess as completed when adding a new one
  if (process.subprocesses.length > 0) {
    const lastSubprocess = process.subprocesses[process.subprocesses.length - 1];
    lastSubprocess.completed = true;
  }
  
  // Add the new subprocess
  process.subprocesses.push({
    name: subprocessName,
    time: 0,
    formattedTime: '00:00:00',
    completed: false,
    activityType: '', // VA or NVA
    remarks: '',      // Remarks
    personCount: 1    // Default number of persons required
  });
  
  // Start the timer automatically if this is the first subprocess
  if (process.subprocesses.length === 1 && !process.timerRunning) {
    // Auto-start timer
    process.timerRunning = true;
    process.active = true;
    const now = Date.now();
    process.startTime = now;
    process.lastLapTime = now;
    
    // Set up interval
    state.timerIntervals[process.name] = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - process.startTime;
      
      // Calculate the time difference since the last lap
      const lapTime = currentTime - process.lastLapTime;
      
      state.timers[process.name] = {
        elapsed,
        lapTime: formatTime(lapTime)
      };
      
      updateTimerDisplay(process.name);
    }, 10);
  }
  
  subprocessInput.value = '';
  renderProcesses();
}

// Delete a subprocess
function deleteSubprocess(processIndex, subprocessIndex) {
  state.processes[processIndex].subprocesses.splice(subprocessIndex, 1);
  renderProcesses();
}

// Toggle timer for a process
function toggleTimer(processIndex) {
  const process = state.processes[processIndex];
  process.timerRunning = !process.timerRunning;
  
  if (process.timerRunning) {
    // Start timer
    process.active = true;
    const now = Date.now();
    process.startTime = now - (process.elapsedTime || 0);
    
    // Reset the lap time counter when starting a new timing session
    if (process.elapsedTime === 0) {
      process.lastLapTime = now;
    }
    
    // Set up interval
    state.timerIntervals[process.name] = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - process.startTime;
      
      // Calculate the time difference since the last lap
      const lapTime = currentTime - (process.lastLapTime || process.startTime);
      
      state.timers[process.name] = {
        elapsed,
        lapTime: formatTime(lapTime)
      };
      
      updateTimerDisplay(process.name);
    }, 10);
  } else {
    // Stop timer
    clearInterval(state.timerIntervals[process.name]);
    delete state.timerIntervals[process.name];
    
    // Save elapsed time
    if (state.timers[process.name]) {
      process.elapsedTime = state.timers[process.name].elapsed;
    }
  }
  
  renderProcesses();
}

// Update the timer display for a process
function updateTimerDisplay(processName) {
  const timerDisplay = document.getElementById(`timer-${processName}`);
  if (timerDisplay && state.timers[processName]) {
    // Only show the time since the last lap (time difference)
    timerDisplay.textContent = state.timers[processName].lapTime;
  }
}

// Reset timer for a process
function resetTimer(processIndex) {
  const process = state.processes[processIndex];
  
  // Clear interval if running
  if (state.timerIntervals[process.name]) {
    clearInterval(state.timerIntervals[process.name]);
    delete state.timerIntervals[process.name];
  }
  
  // Reset timer state
  process.timerRunning = false;
  process.active = false;
  process.elapsedTime = 0;
  process.startTime = null;
  process.lastLapTime = 0;
  process.readings = [];
  
  // Update timers state
  delete state.timers[process.name];
  
  renderProcesses();
  renderRecordedTimes();
}

// Record a lap for a subprocess
function recordLap(processIndex, subprocessIndex) {
  const process = state.processes[processIndex];
  const subprocess = process.subprocesses[subprocessIndex];
  
  if (!process.timerRunning || !state.timers[process.name]) return;
  
  // Get additional data
  const activityType = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`).value;
  const remarks = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`).value;
  const personCount = parseInt(document.getElementById(`person-count-${processIndex}-${subprocessIndex}`).value) || 1;
  
  // Save the additional data to the subprocess
  subprocess.activityType = activityType;
  subprocess.remarks = remarks;
  subprocess.personCount = personCount;
  
  // Calculate time since last lap (this is the time difference)
  const currentTime = Date.now();
  const lapTime = currentTime - process.lastLapTime;
  
  // Record reading with start and end times
  const startTime = new Date(process.lastLapTime);
  const endTime = new Date(currentTime);
  
  const reading = {
    process: process.name,
    subprocess: subprocess.name,
    time: lapTime,
    formattedTime: formatTime(lapTime),
    timestamp: new Date().toISOString(),
    activityType: activityType,
    remarks: remarks,
    personCount: personCount,
    startTime: startTime.toISOString(),        // Store start time
    endTime: endTime.toISOString(),            // Store end time
    formattedStartTime: formatDateTime(startTime), // Formatted for display
    formattedEndTime: formatDateTime(endTime)      // Formatted for display
  };
  
  if (!process.readings) {
    process.readings = [];
  }
  
  process.readings.push(reading);
  
  // Update subprocess time - if multiple lap recordings, add to the existing time
  if (subprocess.time === 0) {
    subprocess.time = lapTime;
    subprocess.formattedTime = formatTime(lapTime);
  } else {
    // For multiple recordings, we'll show the latest lap time
    subprocess.formattedTime = formatTime(lapTime);
  }
  
  // Don't mark as completed so we can record multiple laps
  // subprocess.completed = true;
  
  // Update last lap time to reset the lap timer
  process.lastLapTime = currentTime;
  
  // Reset the timer display to show we're starting a new lap time difference
  if (state.timers[process.name]) {
    state.timers[process.name].lapTime = '00:00:00';
  }
  updateTimerDisplay(process.name);
  
  state.activeProcess = processIndex;
  state.activeSubprocess = subprocessIndex;
  
  // Show a brief confirmation message in the subprocess row
  const flashMessage = (element, text, duration) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = text;
    messageElement.style.color = '#10b981';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.marginTop = '4px';
    
    element.appendChild(messageElement);
    
    setTimeout(() => {
      if (element.contains(messageElement)) {
        element.removeChild(messageElement);
      }
    }, duration);
  };
  
  // Find the subprocess element and flash a confirmation
  const subprocessElements = document.querySelectorAll('.subprocess-row');
  if (subprocessElements && subprocessElements.length > subprocessIndex) {
    const timeCell = subprocessElements[subprocessIndex].querySelector('td:nth-child(4)');
    if (timeCell) {
      flashMessage(timeCell, `Time recorded: ${formatTime(lapTime)}`, 1500);
    }
  }
  
  renderProcesses();
  renderRecordedTimes();
  recordedTimesContainer.style.display = 'block';
}

// Export data directly to Excel using SheetJS
function exportToExcel() {
  // Prepare all process and subprocess readings
  const allReadings = [];
  
  state.processes.forEach(process => {
    if (process.readings && process.readings.length > 0) {
      process.readings.forEach(reading => {
        allReadings.push({
          "Process": process.name,
          "Subprocess": reading.subprocess,
          "Time (hh:mm:ss)": reading.formattedTime,
          "Activity Type": reading.activityType || "",
          "Persons Required": reading.personCount || 1,
          "Remarks": reading.remarks || "",
          "Start Time": reading.formattedStartTime || "",
          "End Time": reading.formattedEndTime || "",
          "Time (ms)": reading.time,
          "Timestamp": new Date(reading.timestamp).toLocaleString()
        });
      });
    }
  });
  
  if (allReadings.length === 0) {
    alert('No data to export!');
    return;
  }
  
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(allReadings);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Time Motion Study');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, 'time_motion_study.xlsx');
}

// Render the processes table
function renderProcesses() {
  processTableBody.innerHTML = '';
  
  state.processes.forEach((process, processIndex) => {
    // Process Row
    const processRow = document.createElement('tr');
    if (process.active) {
      processRow.className = 'active-row';
    }
    
    processRow.innerHTML = `
      <td>
        <div>${process.name}</div>
        <div class="action-buttons">
          <span class="action-link" onclick="startEditProcess(${processIndex})">Edit</span>
          <span class="action-link delete" onclick="deleteProcess(${processIndex})">Delete</span>
        </div>
      </td>
      <td>
        <div class="timer-display" id="timer-${process.name}">
          ${process.timerRunning && state.timers[process.name] ? state.timers[process.name].lapTime : '00:00:00'}
        </div>
      </td>
      <td>
        <div class="controls">
          <button class="${process.timerRunning ? 'btn-danger' : 'btn-success'}" onclick="toggleTimer(${processIndex})">
            ${process.timerRunning ? 'Stop' : 'Start'}
          </button>
          <button class="btn-secondary" onclick="resetTimer(${processIndex})">Reset</button>
        </div>
      </td>
      <td colspan="2">
        <div class="subprocess-input">
          <input type="text" id="subprocess-input-${processIndex}" placeholder="Enter subprocess name">
          <button class="btn-primary" onclick="addSubprocess(${processIndex})">Add</button>
        </div>
      </td>
    `;
    
    processTableBody.appendChild(processRow);
    
    // Find the last uncompleted subprocess (the one that should be active)
    let activeSubprocessIndex = -1;
    for (let i = process.subprocesses.length - 1; i >= 0; i--) {
      if (!process.subprocesses[i].completed) {
        activeSubprocessIndex = i;
        break;
      }
    }
    
    // If no uncompleted subprocess was found, set the last one as active
    if (activeSubprocessIndex === -1 && process.subprocesses.length > 0) {
      activeSubprocessIndex = process.subprocesses.length - 1;
    }
    
    // Subprocess Rows
    process.subprocesses.forEach((subprocess, subprocessIndex) => {
      const subprocessRow = document.createElement('tr');
      subprocessRow.className = 'subprocess-row';
      
      if (state.activeProcess === processIndex && state.activeSubprocess === subprocessIndex) {
        subprocessRow.className += ' active-subprocess';
      }
      
      // Enable the lap button for the active subprocess
      // Disable lap buttons for subprocesses that come before the active one
      const isActive = (subprocessIndex === activeSubprocessIndex);
      const isButtonEnabled = process.timerRunning && isActive;
      
      subprocessRow.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td>
          <div class="subprocess-details">
            <div class="subprocess-name">${subprocess.name}</div>
            ${subprocess.formattedTime !== '00:00:00' ? 
              `<span class="subprocess-time">${subprocess.formattedTime}</span>` : ''}
            
            <div class="subprocess-inputs">
              <div class="input-group">
                <label for="activity-type-${processIndex}-${subprocessIndex}">Activity Type:</label>
                <select id="activity-type-${processIndex}-${subprocessIndex}" class="activity-type-select">
                  <option value="" ${subprocess.activityType === '' ? 'selected' : ''}>Select</option>
                  <option value="VA" ${subprocess.activityType === 'VA' ? 'selected' : ''}>VA</option>
                  <option value="NVA" ${subprocess.activityType === 'NVA' ? 'selected' : ''}>NVA</option>
                </select>
              </div>
              
              <div class="input-group">
                <label for="remarks-${processIndex}-${subprocessIndex}">Remarks:</label>
                <input type="text" id="remarks-${processIndex}-${subprocessIndex}" class="remarks-input" 
                  value="${subprocess.remarks || ''}" placeholder="Add remarks">
              </div>
              
              <div class="input-group">
                <label for="person-count-${processIndex}-${subprocessIndex}">Persons:</label>
                <input type="number" id="person-count-${processIndex}-${subprocessIndex}" class="person-count-input" 
                  value="${subprocess.personCount || 1}" min="1" max="100">
              </div>
            </div>
          </div>
        </td>
        <td>
          <div class="controls">
            <button class="${isButtonEnabled ? 'btn-primary' : 'btn-secondary'}" 
              ${!isButtonEnabled ? 'disabled' : ''}
              onclick="recordLap(${processIndex}, ${subprocessIndex})">
              Lap
            </button>
          </div>
        </td>
      `;
      
      processTableBody.appendChild(subprocessRow);
    });
  });
}

// Render the recorded times table
// Render the recorded times table
function renderRecordedTimes() {
  recordedTimesTableBody.innerHTML = '';
  let hasReadings = false;
  
  state.processes.forEach(process => {
    if (process.readings && process.readings.length > 0) {
      hasReadings = true;
      
      process.readings.forEach(reading => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${process.name}</td>
          <td>${reading.subprocess}</td>
          <td>${reading.formattedTime}</td>
          <td>${reading.activityType || ""}</td>
          <td>${reading.personCount || 1}</td>
          <td>${reading.remarks || ""}</td>
          <td>${reading.formattedStartTime || ""}</td>
          <td>${reading.formattedEndTime || ""}</td>
          <td>${new Date(reading.timestamp).toLocaleString()}</td>
        `;
        
        recordedTimesTableBody.appendChild(row);
      });
    }
  });
  
  recordedTimesContainer.style.display = hasReadings ? 'block' : 'none';
}

// Event Listeners
addProcessBtn.addEventListener('click', addProcess);
updateProcessBtn.addEventListener('click', saveEditProcess);
cancelEditBtn.addEventListener('click', cancelEdit);
exportBtn.addEventListener('click', exportToExcel);

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  // Check for saved data in localStorage
  const savedData = localStorage.getItem('timeMotionData');
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      state.processes = parsedData.processes || [];
      
      if (state.processes.length > 0) {
        renderProcesses();
        renderRecordedTimes();
        processTableContainer.style.display = 'block';
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
  }
  
  // Save data periodically
  setInterval(function() {
    localStorage.setItem('timeMotionData', JSON.stringify({
      processes: state.processes
    }));
  }, 10000); // Save every 10 seconds
});
