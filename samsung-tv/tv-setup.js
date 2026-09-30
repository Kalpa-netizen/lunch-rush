/**
 * Injects Samsung TV Remote shortcut legend and server configuration modal
 */
(function() {
  'use strict';

  function createTvUi() {
    // 1. Create bottom remote hints bar
    const bar = document.createElement('div');
    bar.className = 'tv-remote-bar';
    bar.id = 'lr-tv-remote-bar';
    bar.innerHTML = `
      <div class="tv-key-item"><span class="tv-color-dot red"></span><span>Server/Host</span></div>
      <div class="tv-key-item"><span class="tv-color-dot green"></span><span>Audio</span></div>
      <div class="tv-key-item"><span class="tv-color-dot yellow"></span><span>AI Demo</span></div>
      <div class="tv-key-item"><span class="tv-color-dot blue"></span><span>Fullscreen</span></div>
      <div class="tv-key-item"><span class="tv-key-badge">RETURN</span><span>Exit/Back</span></div>
    `;
    document.body.appendChild(bar);

    // 2. Create Server Configuration Modal
    const modal = document.createElement('div');
    modal.id = 'lr-tv-server-modal';
    modal.style.display = 'none';

    const savedUrl = localStorage.getItem('lr-server-url') || (window.location.protocol.startsWith('http') ? window.location.origin : 'http://192.168.1.100:3000');

    modal.innerHTML = `
      <div class="tv-modal-card">
        <div class="tv-modal-title">SAMSUNG TV SERVER CONFIG</div>
        <div class="tv-modal-desc">
          Enter the LAN IP address or URL of the computer running the <b>Lunch Rush</b> game server.
        </div>
        <div class="tv-input-group">
          <label class="tv-input-label" for="tv-server-url-input">Server Address (e.g. http://192.168.1.50:3000)</label>
          <input id="tv-server-url-input" class="tv-text-input" type="text" value="${savedUrl}" placeholder="http://192.168.1.50:3000" />
        </div>
        <div class="tv-btn-row">
          <button id="tv-cancel-server-btn" class="tv-btn tv-btn-secondary">Cancel</button>
          <button id="tv-save-server-btn" class="tv-btn tv-btn-primary">Connect</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('tv-server-url-input');
    const saveBtn = document.getElementById('tv-save-server-btn');
    const cancelBtn = document.getElementById('tv-cancel-server-btn');

    saveBtn.addEventListener('click', () => {
      let val = input.value.trim();
      if (val) {
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
          val = 'http://' + val;
        }
        localStorage.setItem('lr-server-url', val);
        window.location.href = window.location.pathname + '?server=' + encodeURIComponent(val);
      }
    });

    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // If on file:// protocol and no server URL is stored, auto-open the modal
    if (window.location.protocol === 'file:' && !localStorage.getItem('lr-server-url')) {
      modal.style.display = 'flex';
      setTimeout(() => input.focus(), 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTvUi);
  } else {
    createTvUi();
  }
})();
