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
  const saveBackupBtn = document.getElementById('saveBackupBtn');
  
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
  
  // Toggle collapsible sections
  function toggleSection(sectionId) {
    const header = event.currentTarget;
    header.classList.toggle('collapsed');
    const section = document.getElementById(sectionId);
    
    if (section) {
      if (header.classList.contains('collapsed')) {
        section.style.display = 'none';
      } else {
        section.style.display = 'block';
      }
    }
  }
  
  // Show record details on mobile
  function showRecordDetails(index) {
    // Only show details popup on mobile
    if (window.innerWidth > 768) return;
    
    const reading = getReadingByIndex(index);
    if (!reading) return;
    
    // Create details popup
    const popup = document.createElement('div');
    popup.className = 'details-popup';
    
    popup.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
        <h3 style="margin:0;">${reading.process} - ${reading.subprocess}</h3>
        <span onclick="closeDetailsPopup()" style="cursor:pointer; font-size:24px;">&times;</span>
      </div>
      <div style="margin-bottom:10px;"><strong>Time:</strong> ${reading.formattedTime}</div>
      <div style="margin-bottom:10px;"><strong>Activity Type:</strong> ${reading.activityType || 'Not specified'}</div>
      <div style="margin-bottom:10px;"><strong>Persons Required:</strong> ${reading.personCount || 1}</div>
      <div style="margin-bottom:10px;"><strong>Remarks:</strong> ${reading.remarks || 'None'}</div>
      <div style="margin-bottom:10px;"><strong>Start Time:</strong> ${reading.formattedStartTime || ''}</div>
      <div style="margin-bottom:10px;"><strong>End Time:</strong> ${reading.formattedEndTime || ''}</div>
      <div><strong>Timestamp:</strong> ${new Date(reading.timestamp).toLocaleString()}</div>
    `;
    
    // Remove any existing popup
    closeDetailsPopup();
    
    // Add to body
    document.body.appendChild(popup);
    
    // Prevent scrolling on main content
    document.body.style.overflow = 'hidden';
  }
  
  // Close details popup
  function closeDetailsPopup() {
    const popup = document.querySelector('.details-popup');
    if (popup) {
      popup.remove();
      document.body.style.overflow = '';
    }
  }
  
  // Get reading by index (helper function for mobile details view)
  function getReadingByIndex(index) {
    let count = 0;
    for (const process of state.processes) {
      if (process.readings && process.readings.length > 0) {
        for (const reading of process.readings) {
          if (count === index) {
            return reading;
          }
          count++;
        }
      }
    }
    return null;
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
    
    // Save to localStorage
    saveToLocalStorage();
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
    
    // Save to localStorage
    saveToLocalStorage();
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
    
    // Save to localStorage
    saveToLocalStorage();
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
    
    // NOTE: No longer auto-starting the timer here
    
    subprocessInput.value = '';
    renderProcesses();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete a subprocess
// Function to delete a specific subprocess
function deleteSubprocess(processIndex, subprocessIndex) {
    // Show confirmation dialog with options
    const subprocess = state.processes[processIndex].subprocesses[subprocessIndex];
    const subprocess_name = subprocess.name;
    
    const deleteModal = document.createElement('div');
    deleteModal.className = 'modal';
    deleteModal.style.display = 'block';
    
    deleteModal.innerHTML = `
      <div class="modal-content">
        <span class="close-button" onclick="document.querySelector('.modal').remove()">&times;</span>
        <h3>Delete Options for "${subprocess_name}"</h3>
        <p>What would you like to delete?</p>
        <div class="button-group">
          <button onclick="deleteSubprocessOnly(${processIndex}, ${subprocessIndex})" class="btn-danger">
            Delete Subprocess Only
          </button>
          <button onclick="deleteSubprocessWithReadings(${processIndex}, ${subprocessIndex})" class="btn-danger">
            Delete Subprocess & All Readings
          </button>
          <button onclick="document.querySelector('.modal').remove()" class="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(deleteModal);
  }

  // Delete all readings of a specific subprocess
function deleteSubprocessReadings(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Remove all readings related to this subprocess
    if (process.readings && process.readings.length > 0) {
      process.readings = process.readings.filter(reading => reading.subprocess !== subprocessName);
    }
    
    // Reset the subprocess time display
    subprocess.time = 0;
    subprocess.formattedTime = '00:00:00';
    
    // Re-render the UI
    renderProcesses();
    renderRecordedTimes();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete the last reading of a specific subprocess
  function deleteLastReading(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Find all readings for this subprocess
    if (process.readings && process.readings.length > 0) {
      // Find the indices of all readings for this subprocess
      const readingIndices = [];
      process.readings.forEach((reading, index) => {
        if (reading.subprocess === subprocessName) {
          readingIndices.push(index);
        }
      });
      
      // If there are readings, remove the last one
      if (readingIndices.length > 0) {
        const lastIndex = readingIndices[readingIndices.length - 1];
        process.readings.splice(lastIndex, 1);
        
        // Update the subprocess time display to show the previous reading (if any)
        if (readingIndices.length > 1) {
          const previousIndex = readingIndices[readingIndices.length - 2];
          subprocess.time = process.readings[previousIndex].time;
          subprocess.formattedTime = process.readings[previousIndex].formattedTime;
        } else {
          // If there are no more readings, reset the display
          subprocess.time = 0;
          subprocess.formattedTime = '00:00:00';
        }
      }
    }
    
    // Re-render the UI
    renderProcesses();
    renderRecordedTimes();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete just the subprocess but keep its readings
  function deleteSubprocessOnly(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    
    // Remove the subprocess
    process.subprocesses.splice(subprocessIndex, 1);
    
    // Remove any modal dialogs
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    
    // Re-render the UI
    renderProcesses();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete both the subprocess and all its readings
  function deleteSubprocessWithReadings(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Remove the subprocess
    process.subprocesses.splice(subprocessIndex, 1);
    
    // Remove all readings related to this subprocess
    if (process.readings && process.readings.length > 0) {
      process.readings = process.readings.filter(reading => reading.subprocess !== subprocessName);
    }
    
    // Remove any modal dialogs
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    
    // Re-render the UI
    renderProcesses();
    renderRecordedTimes();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Function to delete a specific reading
  function deleteReading(processIndex, readingIndex) {
    const process = state.processes[processIndex];
    
    // Remove the reading
    if (process.readings && process.readings.length > readingIndex) {
      process.readings.splice(readingIndex, 1);
      
      // Re-render tables
      renderRecordedTimes();
      
      // Save to localStorage
      saveToLocalStorage();
    }
  }
  
  // Toggle timer for a process
 // Toggle timer for a process
// Toggle timer for a process
// Toggle timer for a process
// Toggle timer for a process
function toggleTimer(processIndex) {
    const process = state.processes[processIndex];
    process.timerRunning = !process.timerRunning;
    
    if (process.timerRunning) {
      // Start timer
      process.active = true;
      const now = Date.now();
      
      // Only reset timing values, NOT any other data
      // We're careful not to reset subprocesses or their data
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
    } else {
      // Stop timer
      clearInterval(state.timerIntervals[process.name]);
      delete state.timerIntervals[process.name];
      
      // Save elapsed time
      if (state.timers[process.name]) {
        process.elapsedTime = state.timers[process.name].elapsed;
      }
    }
    
    // Need to redraw everything for lap buttons to work correctly
    renderProcesses();
    
    // Save to localStorage
    saveToLocalStorage();
  }

    
    renderProcesses();
    
    // Save to localStorage
    saveToLocalStorage();
  
  
  // Update the timer display for a process
  function updateTimerDisplay(processName) {
    const timerDisplay = document.getElementById(`timer-${processName}`);
    if (timerDisplay && state.timers[processName]) {
      // Only show the time since the last lap (time difference)
      timerDisplay.textContent = state.timers[processName].lapTime;
    }
  }
  
  // Reset ONLY timer for a process (preserve readings)
  function resetTimer(processIndex) {
    const process = state.processes[processIndex];
    
    // Clear interval if running
    if (state.timerIntervals[process.name]) {
      clearInterval(state.timerIntervals[process.name]);
      delete state.timerIntervals[process.name];
    }
    
    // Reset only timer state, NOT readings
    process.timerRunning = false;
    process.active = false;
    process.elapsedTime = 0;
    process.startTime = null;
    process.lastLapTime = 0;
    
    // Update timers state
    delete state.timers[process.name];
    
    // Re-render the process table but do not clear recorded times
    renderProcesses();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Record a lap for a subprocess
// Record a lap for a subprocess
function recordLap(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    
    if (!process.timerRunning || !state.timers[process.name]) return;
    
    // Get additional data
    const activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
    const remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
    const personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
    
    if (!activityTypeElement || !remarksElement || !personCountElement) {
      console.error("Could not find form elements for subprocess", processIndex, subprocessIndex);
      return;
    }
    
    const activityType = activityTypeElement.value;
    const remarks = remarksElement.value;
    const personCount = parseInt(personCountElement.value) || 1;
    
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
    
    // Show a brief confirmation message
    showNotification(`Time recorded: ${formatTime(lapTime)}`);
    
    // Re-render to update the UI
    renderProcesses();
    renderRecordedTimes();
    recordedTimesContainer.style.display = 'block';
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Show a notification
  function showNotification(message, duration = 2000) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    // Set message and show
    notification.textContent = message;
    notification.classList.add('show');
    
    // Hide after duration
    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
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
  
  // Save backup data to file
  function saveBackup() {
    const backupData = JSON.stringify({
      processes: state.processes,
      timestamp: new Date().toISOString()
    });
    
    // Create a downloadable file
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-motion-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Show import modal
  function showImportModal() {
    document.getElementById('fileImportModal').style.display = 'block';
  }
  
  // Close import modal
  function closeImportModal() {
    document.getElementById('fileImportModal').style.display = 'none';
  }
  
  // Process backup file for import
  function processBackupFile() {
    const fileInput = document.getElementById('backupFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please select a file to import.');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const parsedData = JSON.parse(e.target.result);
        
        if (!parsedData.processes) {
          throw new Error('Invalid backup file format');
        }
        
        state.processes = parsedData.processes;
        
        renderProcesses();
        renderRecordedTimes();
        
        if (state.processes.length > 0) {
          processTableContainer.style.display = 'block';
        }
        
        // Save to localStorage
        saveToLocalStorage();
        
        closeImportModal();
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  }
  
  // Save data to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('timeMotionData', JSON.stringify({
        processes: state.processes,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }
  
  // Render the processes table
// Render the processes table
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
          <td>
            <div class="delete-buttons">
              <button class="btn-danger btn-small" title="Delete last reading" onclick="deleteLastReading(${processIndex}, ${subprocessIndex})">
                Delete Last
              </button>
              <button class="btn-danger btn-small" title="Delete all readings" onclick="deleteSubprocessReadings(${processIndex}, ${subprocessIndex})">
                Delete All
              </button>
            </div>
          </td>
          <td></td>
          <td></td>
          <td>
            <div class="subprocess-details">
              <div class="subprocess-name-container">
                <div class="subprocess-name">${subprocess.name}</div>
                ${subprocess.formattedTime !== '00:00:00' ? 
                  `<span class="subprocess-time">${subprocess.formattedTime}</span>` : ''}
              </div>
              
              <div class="subprocess-inputs">
                <div class="input-group">
                  <label for="activity-type-${processIndex}-${subprocessIndex}">Activity Type:</label>
                  <select id="activity-type-${processIndex}-${subprocessIndex}" class="activity-type-select">
                    <option value="" ${subprocess.activityType === '' ? 'selected' : ''}>Select</option>
                    <option value="VA" ${subprocess.activityType === 'VA' ? 'selected' : ''}>VA</option>
                    <option value="NVA" ${subprocess.activityType === 'NVA' ? 'selected' : ''}>NVA</option>
                    <option value="RNVA" ${subprocess.activityType === 'RNVA' ? 'selected' : ''}>RNVA</option>
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
// Update the renderRecordedTimes function to add delete buttons for each reading
// Render the recorded times table
function renderRecordedTimes() {
    recordedTimesTableBody.innerHTML = '';
    let hasReadings = false;
    let readingIndex = 0;
    
    state.processes.forEach((process, processIndex) => {
      if (process.readings && process.readings.length > 0) {
        hasReadings = true;
        
        process.readings.forEach((reading, idx) => {
          const row = document.createElement('tr');
          row.className = 'recorded-times-row';
          row.setAttribute('onclick', `showRecordDetails(${readingIndex})`);
          
          row.innerHTML = `
            <td>${process.name}</td>
            <td>${reading.subprocess}</td>
            <td>${reading.formattedTime}</td>
            <td class="mobile-collapse">${reading.activityType || ""}</td>
            <td class="mobile-collapse">${reading.personCount || 1}</td>
            <td class="mobile-collapse">${reading.remarks || ""}</td>
            <td class="mobile-collapse">${reading.formattedStartTime || ""}</td>
            <td class="mobile-collapse">${reading.formattedEndTime || ""}</td>
            <td class="mobile-collapse">
              ${new Date(reading.timestamp).toLocaleString()}
              <button class="btn-danger btn-small" onclick="event.stopPropagation(); deleteReading(${processIndex}, ${idx})">
                Delete
              </button>
            </td>
          `;
          
          recordedTimesTableBody.appendChild(row);
          readingIndex++;
        });
      }
    });
    
    recordedTimesContainer.style.display = hasReadings ? 'block' : 'none';
  }
  
  // Set up mobile-focused event handlers
  function setupMobileEvents() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('blur', function() {
        // Small delay to let the next focus event occur
        setTimeout(() => {
          // If no element is focused, hide the keyboard
          if (document.activeElement.tagName !== 'INPUT' && 
              document.activeElement.tagName !== 'SELECT') {
            document.activeElement.blur();
          }
        }, 100);
      });
    });
    
    // Better tap handling for mobile
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('touchstart', function() {
        this.classList.add('button-active');
      });
      button.addEventListener('touchend', function() {
        this.classList.remove('button-active');
      });
    });
  }
  
  // Auto-save to Excel on window close
  window.addEventListener('beforeunload', function(e) {
    // Save to localStorage before closing
    saveToLocalStorage();
    
    // This message might not be displayed in modern browsers
    // but is needed to ensure the beforeunload event fires on some browsers
    e.preventDefault();
    e.returnValue = '';
  });
  
  // Event Listeners
  addProcessBtn.addEventListener('click', addProcess);
  updateProcessBtn.addEventListener('click', saveEditProcess);
  cancelEditBtn.addEventListener('click', cancelEdit);
  exportBtn.addEventListener('click', exportToExcel);
  saveBackupBtn.addEventListener('click', saveBackup);
  
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
    
    // Setup mobile-specific event handlers
    setupMobileEvents();
    
    // Save data periodically
    setInterval(function() {
      saveToLocalStorage();
    }, 10000); // Save every 10 seconds
  });
