/**
 * Samsung Smart TV (Tizen OS) Remote Control Integration
 * Handles TV remote key events, D-Pad spatial navigation, and shortcuts
 */

(function () {
  'use strict';

  // Register Samsung TV Keys
  function initTizenKeys() {
    if (window.tizen && window.tizen.tvinputdevice) {
      const keysToRegister = [
        'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
        'MediaFastForward', 'MediaRewind',
        'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'ChannelUp', 'ChannelDown', 'VolumeUp', 'VolumeDown'
      ];

      keysToRegister.forEach(function (keyName) {
        try {
          window.tizen.tvinputdevice.registerKey(keyName);
        } catch (e) {
          // Some keys might not be supported on older models; ignore safely
        }
      });
    }
  }

  // Spatial Navigation for D-Pad
  function getFocusableElements() {
    return Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
    });
  }

  function findClosestElement(currentEl, direction) {
    const focusables = getFocusableElements();
    if (!focusables.length) return null;
    if (!currentEl) return focusables[0];

    const currentRect = currentEl.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestElement = null;
    let minDistance = Infinity;

    focusables.forEach((el) => {
      if (el === currentEl) return;
      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isValid = false;
      if (direction === 'up' && dy < -5) isValid = true;
      if (direction === 'down' && dy > 5) isValid = true;
      if (direction === 'left' && dx < -5) isValid = true;
      if (direction === 'right' && dx > 5) isValid = true;

      if (isValid) {
        // Distance with weight favoring the main axis direction
        const dist = Math.sqrt(dx * dx + dy * dy) + (direction === 'up' || direction === 'down' ? Math.abs(dx) * 1.5 : Math.abs(dy) * 1.5);
        if (dist < minDistance) {
          minDistance = dist;
          bestElement = el;
        }
      }
    });

    return bestElement;
  }

  function handleKeyDown(e) {
    const keyCode = e.keyCode;
    let active = document.activeElement;

    // Samsung Tizen Key Codes
    const KEY_RETURN = 10009;
    const KEY_ENTER = 13;
    const KEY_LEFT = 37;
    const KEY_UP = 38;
    const KEY_RIGHT = 39;
    const KEY_DOWN = 40;
    const KEY_RED = 403;
    const KEY_GREEN = 404;
    const KEY_YELLOW = 405;
    const KEY_BLUE = 406;
    const KEY_PLAY_PAUSE = 10252;

    switch (keyCode) {
      case KEY_UP: {
        const next = findClosestElement(active, 'up');
        if (next) {
          next.focus();
          e.preventDefault();
        }
        break;
      }
      case KEY_DOWN: {
        const next = findClosestElement(active, 'down');
        if (next) {
          next.focus();
          e.preventDefault();
        }
        break;
      }
      case KEY_LEFT: {
        const next = findClosestElement(active, 'left');
        if (next) {
          next.focus();
          e.preventDefault();
        }
        break;
      }
      case KEY_RIGHT: {
        const next = findClosestElement(active, 'right');
        if (next) {
          next.focus();
          e.preventDefault();
        }
        break;
      }
      case KEY_RETURN:
      case 27: { // Escape / Return key
        // Check if a modal is open
        const modal = document.querySelector('.modal, .settings-dialog, #server-modal');
        if (modal && modal.style.display !== 'none') {
          const closeBtn = modal.querySelector('button.close, button[aria-label="Close"]');
          if (closeBtn) closeBtn.click();
          else modal.style.display = 'none';
        } else {
          // Show exit confirmation on Samsung TV
          if (window.confirm('Do you want to exit Lunch Rush?')) {
            if (window.tizen && window.tizen.application) {
              window.tizen.application.getCurrentApplication().exit();
            }
          }
        }
        e.preventDefault();
        break;
      }
      case KEY_RED: {
        // Red Key: Trigger Host Settings / Server Config
        const settingsBtn = document.querySelector('button[title*="Settings"], button:has(span:contains("SETTINGS")), .host-settings-toggle');
        if (settingsBtn) settingsBtn.click();
        else {
          const serverModal = document.getElementById('lr-tv-server-modal');
          if (serverModal) serverModal.style.display = serverModal.style.display === 'flex' ? 'none' : 'flex';
        }
        e.preventDefault();
        break;
      }
      case KEY_GREEN: {
        // Green Key: Toggle Audio / Sound
        const soundBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SOUND') || b.textContent.includes('AUDIO'));
        if (soundBtn) soundBtn.click();
        e.preventDefault();
        break;
      }
      case KEY_YELLOW: {
        // Yellow Key: Toggle Demo Rider
        const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DEMO'));
        if (demoBtn) demoBtn.click();
        e.preventDefault();
        break;
      }
      case KEY_BLUE:
      case KEY_PLAY_PAUSE: {
        // Blue Key: Toggle Fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        e.preventDefault();
        break;
      }
    }
  }

  // Initialize on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    initTizenKeys();
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus first interactive element
    setTimeout(() => {
      const focusables = getFocusableElements();
      if (focusables.length > 0 && document.activeElement === document.body) {
        focusables[0].focus();
      }
    }, 1000);
  });
})();
