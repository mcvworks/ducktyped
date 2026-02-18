// ============================================
// DUCKTYPED — STANDALONE PAGE INIT
// Shared theme toggle, stubs for core.js dependencies
// Include this AFTER core.js on all standalone pages
// ============================================

// Theme support
function changeTheme(theme) {
    if (theme === 'light') { document.body.classList.add('light-theme'); }
    else { document.body.classList.remove('light-theme'); }
    localStorage.setItem('selectedTheme', theme);
    var logo = document.getElementById('siteLogo');
    if (logo) { logo.src = theme === 'light' ? '/quacktools-logo-light.png' : '/quacktools-logo-dark.png'; }
    var btn = document.getElementById('themeToggleBtn');
    if (btn) { btn.textContent = theme === 'light' ? '🌙' : '☀️'; }
}

function toggleTheme() {
    var isLight = document.body.classList.contains('light-theme');
    changeTheme(isLight ? 'dark' : 'light');
}

// Apply saved theme immediately
(function() { var saved = localStorage.getItem('selectedTheme'); if (saved) changeTheme(saved); })();

// Stubs for functions that core.js DOMContentLoaded calls but don't exist on standalone pages
if (typeof initDragAndDrop === 'undefined') { window.initDragAndDrop = function() {}; }
if (typeof loadToolOrder === 'undefined') { window.loadToolOrder = function() {}; }
if (typeof loadSavedNotes === 'undefined') { window.loadSavedNotes = function() {}; }
if (typeof initializeEncryptedNotes === 'undefined') { window.initializeEncryptedNotes = function() {}; }
if (typeof showToast === 'undefined') { window.showToast = function(msg) { console.log(msg); }; }
