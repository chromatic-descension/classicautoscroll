// content.js

let isAutoScrolling = false;
let scrollIconElement = null;
let iconOriginX = 0;
let iconOriginY = 0;
let currentMouseX = 0;
let currentMouseY = 0;
let animationFrameId = null;

let accumulatedScrollX = 0;
let accumulatedScrollY = 0;

const DEAD_ZONE = 5;
const SENSITIVITY_BASE_POWER = 1.25;

const DEFAULT_SETTINGS = {
  maxScrollSpeed: 100,
  scrollSensitivity: 0.04,
  scrollMode: 'toggle'
};
let currentSettings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = { ...DEFAULT_SETTINGS, ...data };
  } catch (error) {
    console.error("Error loading autoscroll settings:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

function createScrollIcon() {
  const icon = document.createElement("div");
  icon.style.position = "fixed";
  icon.style.left = `${iconOriginX - 16}px`;
  icon.style.top = `${iconOriginY - 16}px`;
  icon.style.width = "32px";
  icon.style.height = "32px";
  icon.style.backgroundImage = `url('${chrome.runtime.getURL("icon.svg")}')`;
  icon.style.backgroundRepeat = "no-repeat";
  icon.style.backgroundPosition = "center";
  icon.style.backgroundSize = "contain";
  icon.style.borderRadius = "50%";
  icon.style.boxShadow = "0 0 5px rgba(0,0,0,0.5)";
  icon.style.zIndex = "2147483647";
  icon.style.pointerEvents = "none";
  document.body.appendChild(icon);
  return icon;
}

function scrollLoop() {
  if (!isAutoScrolling) return;

  const deltaX = currentMouseX - iconOriginX;
  const deltaY = currentMouseY - iconOriginY;
  let calculatedScrollXThisFrame = 0;
  let calculatedScrollYThisFrame = 0;

  if (Math.abs(deltaX) > DEAD_ZONE) {
    const distanceX = Math.abs(deltaX) - DEAD_ZONE;
    let speed = Math.pow(distanceX, SENSITIVITY_BASE_POWER) * currentSettings.scrollSensitivity;
    calculatedScrollXThisFrame = Math.sign(deltaX) * speed;
    calculatedScrollXThisFrame = Math.max(-currentSettings.maxScrollSpeed, Math.min(currentSettings.maxScrollSpeed, calculatedScrollXThisFrame));
  }

  if (Math.abs(deltaY) > DEAD_ZONE) {
    const distanceY = Math.abs(deltaY) - DEAD_ZONE;
    let speed = Math.pow(distanceY, SENSITIVITY_BASE_POWER) * currentSettings.scrollSensitivity;
    calculatedScrollYThisFrame = Math.sign(deltaY) * speed;
    calculatedScrollYThisFrame = Math.max(-currentSettings.maxScrollSpeed, Math.min(currentSettings.maxScrollSpeed, calculatedScrollYThisFrame));
  }

  accumulatedScrollX += calculatedScrollXThisFrame;
  accumulatedScrollY += calculatedScrollYThisFrame;

  const scrollAmountXToApply = Math.trunc(accumulatedScrollX);
  const scrollAmountYToApply = Math.trunc(accumulatedScrollY);

  if (scrollAmountXToApply !== 0 || scrollAmountYToApply !== 0) {
    let targetElement = document.elementFromPoint(iconOriginX, iconOriginY) || document.body;
    let scrollableParent = targetElement;
    while (scrollableParent && scrollableParent !== document.body && scrollableParent !== document.documentElement) {
      const style = window.getComputedStyle(scrollableParent);
      const overflowY = style.getPropertyValue('overflow-y');
      const overflowX = style.getPropertyValue('overflow-x');
      if (((overflowY === 'auto' || overflowY === 'scroll') && scrollableParent.scrollHeight > scrollableParent.clientHeight) ||
        ((overflowX === 'auto' || overflowX === 'scroll') && scrollableParent.scrollWidth > scrollableParent.clientWidth)) {
        break;
      }
      scrollableParent = scrollableParent.parentElement;
    }

    if (!scrollableParent || scrollableParent === document.body || scrollableParent === document.documentElement) {
      window.scrollBy(scrollAmountXToApply, scrollAmountYToApply);
    } else {
      scrollableParent.scrollLeft += scrollAmountXToApply;
      scrollableParent.scrollTop += scrollAmountYToApply;
    }

    accumulatedScrollX -= scrollAmountXToApply;
    accumulatedScrollY -= scrollAmountYToApply;
  }
  animationFrameId = requestAnimationFrame(scrollLoop);
}

function startAutoscroll(e) {
  if (isAutoScrolling) return;
  isAutoScrolling = true;
  iconOriginX = e.clientX;
  iconOriginY = e.clientY;
  currentMouseX = e.clientX;
  currentMouseY = e.clientY;

  accumulatedScrollX = 0;
  accumulatedScrollY = 0;

  if (scrollIconElement) scrollIconElement.remove();
  scrollIconElement = createScrollIcon();

  document.addEventListener("mousemove", handleMouseMove, { capture: true, passive: true });
  document.addEventListener("mouseup", handleMouseUpStop, { capture: true });
  document.addEventListener("keydown", handleKeyDownStop, { capture: true });
  document.addEventListener("contextmenu", preventContextMenu, { capture: true });

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(scrollLoop);
}

function stopAutoscroll() {
  if (!isAutoScrolling) return;
  isAutoScrolling = false;

  accumulatedScrollX = 0;
  accumulatedScrollY = 0;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (scrollIconElement) {
    scrollIconElement.remove();
    scrollIconElement = null;
  }

  document.removeEventListener("mousemove", handleMouseMove, { capture: true, passive: true });
  document.removeEventListener("mouseup", handleMouseUpStop, { capture: true });
  document.removeEventListener("keydown", handleKeyDownStop, { capture: true });
  setTimeout(() => {
    document.removeEventListener("contextmenu", preventContextMenu, { capture: true });
  }, 50);
}

function handleMouseMove(e) {
  if (!isAutoScrolling) return;
  currentMouseX = e.clientX;
  currentMouseY = e.clientY;
}

function handleMouseUpStop(e) {
  if (!isAutoScrolling) return;

  if (currentSettings.scrollMode === 'toggle') {
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      stopAutoscroll();
    }
  } else if (currentSettings.scrollMode === 'drag') {
    e.preventDefault();
    e.stopPropagation();
    stopAutoscroll();
  }
}

function handleKeyDownStop(e) {
  if (isAutoScrolling && e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    stopAutoscroll();
  }
}

function preventContextMenu(e) {
  if (e.button === 1 && isAutoScrolling) {
    e.preventDefault();
  }
}

document.addEventListener("mousedown", async (e) => {
  if (e.button === 1) { // Middle click
    let targetElement = e.target;
    let isLink = false;
    while (targetElement && targetElement !== document.body && targetElement !== document.documentElement) {
      if (targetElement.tagName === 'A' && targetElement.href) {
        isLink = true;
        break;
      }
      if (targetElement.isContentEditable) {
        return;
      }
      targetElement = targetElement.parentElement;
    }

    if (isLink) {
      return;
    }

    // Check if target is an input, textarea, or select, or contentEditable
    const clickedTagName = e.target.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(clickedTagName) || e.target.isContentEditable) {
      return; // Don't start autoscroll, let default behavior occur
    }


    e.preventDefault();
    e.stopPropagation();

    await loadSettings();

    if (currentSettings.scrollMode === 'toggle') {
      if (isAutoScrolling) {
        stopAutoscroll();
      } else {
        startAutoscroll(e);
      }
    } else if (currentSettings.scrollMode === 'drag') {
      if (!isAutoScrolling) {
        startAutoscroll(e);
      }
    }
  }
}, true);

(async () => {
  await loadSettings();
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      for (let key in changes) {
        if (currentSettings.hasOwnProperty(key) && changes[key].newValue !== undefined) {
          currentSettings[key] = changes[key].newValue;
        }
      }
    }
  });
})();