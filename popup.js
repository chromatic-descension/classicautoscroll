// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const maxSpeedInput = document.getElementById('maxSpeed');
  const maxSpeedValueDisplay = document.getElementById('maxSpeedValue');
  const sensitivityInput = document.getElementById('sensitivity');
  const sensitivityValueDisplay = document.getElementById('sensitivityValue');
  const modeToggleRadio = document.getElementById('modeToggle');
  const modeDragRadio = document.getElementById('modeDrag');
  const scrollModeRadios = document.querySelectorAll('input[name="scrollMode"]');

  const DEFAULT_SETTINGS = {
    maxScrollSpeed: 100,
    scrollSensitivity: 0.10,
    scrollMode: 'toggle'
  };

  // Sensitivity range constants
  const SENSITIVITY = {
    DISPLAY: {
      MIN: 1,
      MAX: 100
    },
    ACTUAL: {
      MIN: 0.001,
      MAX: 0.15
    }
  };

  // Generic value conversion function
  const convertRange = (value, fromRange, toRange) => {
    const fromSize = fromRange.MAX - fromRange.MIN;
    const toSize = toRange.MAX - toRange.MIN;
    const valueScaled = (value - fromRange.MIN) / fromSize;
    return toRange.MIN + (valueScaled * toSize);
  };

  // Specific conversion functions using the generic converter
  const displayToActualSensitivity = (displayValue) => {
    return convertRange(displayValue, SENSITIVITY.DISPLAY, SENSITIVITY.ACTUAL);
  };

  const actualToDisplaySensitivity = (actualValue) => {
    return Math.round(convertRange(actualValue, SENSITIVITY.ACTUAL, SENSITIVITY.DISPLAY));
  };

  // Load current settings and populate the inputs
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    maxSpeedInput.value = settings.maxScrollSpeed;
    maxSpeedValueDisplay.textContent = settings.maxScrollSpeed;

    // Convert actual sensitivity to display value
    const displaySensitivity = actualToDisplaySensitivity(settings.scrollSensitivity);
    sensitivityInput.value = displaySensitivity;
    sensitivityValueDisplay.textContent = displaySensitivity;

    if (settings.scrollMode === 'drag') {
      modeDragRadio.checked = true;
    } else {
      modeToggleRadio.checked = true;
    }
  });

  // Event listener for Max Speed
  maxSpeedInput.addEventListener('input', (event) => {
    const value = parseInt(event.target.value, 10);
    maxSpeedValueDisplay.textContent = value;
    chrome.storage.sync.set({ maxScrollSpeed: value });
  });

  // Event listener for Sensitivity
  sensitivityInput.addEventListener('input', (event) => {
    const displayValue = parseInt(event.target.value, 10);
    sensitivityValueDisplay.textContent = displayValue;
    
    // Convert display value to actual sensitivity value
    const actualValue = displayToActualSensitivity(displayValue);
    chrome.storage.sync.set({ scrollSensitivity: actualValue });
  });

  // Event listener for Scroll Mode
  scrollModeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        chrome.storage.sync.set({ scrollMode: event.target.value });
      }
    });
  });
});