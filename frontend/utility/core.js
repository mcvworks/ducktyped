// ============================================
// QUACKTOOLS — CORE
// Config, Cache, API, Worker, Toast, Utilities
// ============================================

// ============================================
// QUACKTOOLS - COMPLETE SCRIPT WITH WORKER INTEGRATION
// ============================================

// CONFIGURATION
const CONFIG = {
    WORKER_URL: 'https://api.ducktyped.xyz',
    DEBUG: false // Set to true for console logging
};
const WORKER_URL = CONFIG.WORKER_URL;

// ============================================
// CACHE SYSTEM
// ============================================
const CACHE_DURATIONS = {
    dns: 3600000,      // 1 hour (DNS records don't change often)
    whois: 86400000,   // 24 hours (domain info is static)
    ssl: 3600000,      // 1 hour (check certs regularly)
    port: 300000,      // 5 minutes (ports can change)
    ping: 60000,       // 1 minute (network latency varies)
    isp: 86400000,     // 24 hours (ISP info rarely changes)
    mac: 2592000000,   // 30 days (vendor info never changes)
    metadata: 3600000, // 1 hour (page metadata can change)
    redirect: 3600000, // 1 hour (redirects can change)
    urlstatus: 300000  // 5 minutes (status can change)
};

function getCacheKey(tool, params) {
    // Create unique cache key from tool + params
    const paramStr = JSON.stringify(params);
    return `cache_${tool}_${paramStr}`;
}

function getCache(tool, params) {
    try {
        const key = getCacheKey(tool, params);
        const cached = localStorage.getItem(key);
        
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        const maxAge = CACHE_DURATIONS[tool] || 300000; // Default 5 min
        
        if (age < maxAge) {
            if (CONFIG.DEBUG) console.log(`✅ Cache hit for ${tool} (age: ${(age/1000).toFixed(0)}s)`);
            return data.response;
        }
        
        // Cache expired, remove it
        localStorage.removeItem(key);
        return null;
    } catch (error) {
        console.warn('Cache read error:', error);
        return null;
    }
}

function setCache(tool, params, response) {
    try {
        const key = getCacheKey(tool, params);
        const data = JSON.stringify({
            response,
            timestamp: Date.now()
        });
        localStorage.setItem(key, data);
        if (CONFIG.DEBUG) console.log(`💾 Cached ${tool} response`);
    } catch (error) {
        console.warn('Cache write error:', error);
        // If localStorage is full, clear old cache and retry
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
            try {
                const key = getCacheKey(tool, params);
                const data = JSON.stringify({
                    response,
                    timestamp: Date.now()
                });
                localStorage.setItem(key, data);
            } catch (e) {
                console.warn('Cache still full after cleanup');
            }
        }
    }
}

function clearOldCache() {
    if (CONFIG.DEBUG) console.log('🧹 Clearing old cache...');
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    
    // Sort by timestamp (oldest first) before removing
    cacheKeys.sort((a, b) => {
        try {
            const aTime = JSON.parse(localStorage.getItem(a))?.timestamp || 0;
            const bTime = JSON.parse(localStorage.getItem(b))?.timestamp || 0;
            return aTime - bTime;
        } catch { return 0; }
    });
    
    // Remove oldest 25% of cached items
    const toRemove = Math.ceil(cacheKeys.length * 0.25);
    cacheKeys.slice(0, toRemove).forEach(key => {
        localStorage.removeItem(key);
    });
    if (CONFIG.DEBUG) console.log(`Removed ${toRemove} old cache entries`);
}

// Clear all cache - callable from console
window.clearCache = function() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    if (CONFIG.DEBUG) console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
};

// ============================================
// API USAGE TRACKING WITH RATE LIMIT WARNINGS
// ============================================
const RATE_LIMITS = {
    dns: { perMinute: 60, perDay: 2000 },
    whois: { perMinute: 60, perDay: 1500 },
    isp: { perMinute: 60, perDay: 1500 },
    mac: { perMinute: 45, perDay: 1500 },
    ssl: { perMinute: 80, perDay: 12000 },
    port: { perMinute: 80, perDay: 12000 }
};

const apiUsage = {
    dns: 0,
    whois: 0,
    ssl: 0,
    port: 0,
    ping: 0,
    isp: 0,
    mac: 0,
    startTime: Date.now(),
    lastMinuteReset: Date.now(),
    minuteCounts: {
        dns: 0,
        whois: 0,
        ssl: 0,
        port: 0,
        isp: 0,
        mac: 0
    },
    blocked: {} // tracks which tools are currently blocked
};

function trackAPICall(apiName) {
    if (apiUsage[apiName] !== undefined) {
        // Reset minute counter if needed
        const now = Date.now();
        if (now - apiUsage.lastMinuteReset > 60000) {
            apiUsage.minuteCounts = { dns: 0, whois: 0, ssl: 0, port: 0, isp: 0, mac: 0 };
            apiUsage.lastMinuteReset = now;
        }
        
        apiUsage[apiName]++;
        apiUsage.minuteCounts[apiName]++;
        updateUsageDisplay();
        checkRateLimitWarning(apiName);
    }
}

// Check if a tool is currently rate-limited (called before making requests)
function isRateLimited(apiName) {
    const limits = RATE_LIMITS[apiName];
    if (!limits) return false;

    // Reset minute counter if a minute has passed
    const now = Date.now();
    if (now - apiUsage.lastMinuteReset > 60000) {
        apiUsage.minuteCounts = { dns: 0, whois: 0, ssl: 0, port: 0, isp: 0, mac: 0 };
        apiUsage.lastMinuteReset = now;
        // Clear any blocked state for minute limits
        Object.keys(apiUsage.blocked).forEach(key => {
            if (apiUsage.blocked[key] === 'minute') delete apiUsage.blocked[key];
        });
    }

    if (apiUsage.minuteCounts[apiName] >= limits.perMinute) {
        apiUsage.blocked[apiName] = 'minute';
        return true;
    }
    if (apiUsage[apiName] >= limits.perDay) {
        apiUsage.blocked[apiName] = 'day';
        return true;
    }
    return false;
}

// Get seconds remaining until the minute-based block lifts
function getSecondsUntilReset() {
    const elapsed = Date.now() - apiUsage.lastMinuteReset;
    return Math.max(0, Math.ceil((60000 - elapsed) / 1000));
}

function checkRateLimitWarning(apiName) {
    const limits = RATE_LIMITS[apiName];
    if (!limits) return;
    
    const minuteCount = apiUsage.minuteCounts[apiName];
    const dayCount = apiUsage[apiName];
    
    // Hit the per-minute limit — show countdown
    if (minuteCount >= limits.perMinute) {
        showRateLimitCountdown(apiName);
        return;
    }

    // Approaching per-minute limit (80%) — show warning
    if (minuteCount >= limits.perMinute * 0.8) {
        const remaining = limits.perMinute - minuteCount;
        showRateLimitWarning(apiName, 'minute', remaining, limits.perMinute);
    }
    
    // Approaching per-day limit (80%)
    if (dayCount >= limits.perDay * 0.8) {
        const remaining = limits.perDay - dayCount;
        if (remaining <= 50) {
            showRateLimitWarning(apiName, 'day', remaining, limits.perDay);
        }
    }
}

// Persistent countdown banner when a tool is rate-limited
function showRateLimitCountdown(apiName) {
    // Don't stack multiple countdowns for the same tool
    const existingBanner = document.getElementById('rate-limit-banner-' + apiName);
    if (existingBanner) return;

    const banner = document.createElement('div');
    banner.id = 'rate-limit-banner-' + apiName;
    banner.className = 'rate-limit-banner';

    const toolLabel = apiName.toUpperCase();
    const secondsLeft = getSecondsUntilReset();

    banner.innerHTML = `
        <div class="rate-limit-banner-inner">
            <div class="rate-limit-banner-icon">⏳</div>
            <div class="rate-limit-banner-text">
                <strong>${toolLabel} — Rate limit reached</strong>
                <span>You've made too many requests in a short time. This is to keep the service running smoothly for everyone. 
                You can try again in <span class="rate-limit-countdown" id="countdown-${apiName}">${secondsLeft}</span>s.</span>
            </div>
            <button class="rate-limit-banner-close" onclick="this.parentElement.parentElement.remove()" title="Dismiss">&times;</button>
        </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => banner.classList.add('show'));

    // Start countdown
    const countdownEl = document.getElementById('countdown-' + apiName);
    const interval = setInterval(() => {
        const secs = getSecondsUntilReset();
        if (countdownEl) countdownEl.textContent = secs;

        if (secs <= 0) {
            clearInterval(interval);
            // Auto-remove with fade
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 400);
            delete apiUsage.blocked[apiName];
        }
    }, 1000);
}

function showRateLimitWarning(apiName, period, remaining, limit) {
    const message = `⚠️ Rate Limit Warning: ${apiName.toUpperCase()} - ${remaining} requests remaining this ${period} (limit: ${limit}/${period})`;
    console.warn(message);
    
    // Show visual warning to user
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #F2C200;
        color: #111318;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        font-size: 0.9em;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    warningDiv.innerHTML = `
        ⚠️ <strong>Heads up</strong><br>
        <span style="font-size: 0.85em; font-weight: 400;">
            ${remaining} ${apiName.toUpperCase()} requests left this ${period}.
            ${period === 'minute' ? 'Limit resets shortly.' : 'Limit resets at midnight.'}
        </span>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        warningDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => warningDiv.remove(), 300);
    }, 5000);
}

function updateUsageDisplay() {
    if (!CONFIG.DEBUG) return;
    const uptimeHours = ((Date.now() - apiUsage.startTime) / (1000 * 60 * 60)).toFixed(1);
    console.log(`📊 API Usage (${uptimeHours}h): DNS=${apiUsage.dns}, WHOIS=${apiUsage.whois}, SSL=${apiUsage.ssl}`);
}

function getUsageStats() {
    const uptimeHours = ((Date.now() - apiUsage.startTime) / (1000 * 60 * 60)).toFixed(1);
    return {
        uptime: `${uptimeHours} hours`,
        'DNS (total)': apiUsage.dns,
        'DNS (this minute)': apiUsage.minuteCounts.dns,
        'DNS remaining (minute)': Math.max(0, RATE_LIMITS.dns.perMinute - apiUsage.minuteCounts.dns),
        'DNS remaining (day)': Math.max(0, RATE_LIMITS.dns.perDay - apiUsage.dns),
        'WHOIS (total)': apiUsage.whois,
        'WHOIS (this minute)': apiUsage.minuteCounts.whois,
        'SSL': apiUsage.ssl,
        'Port': apiUsage.port,
        'ISP': apiUsage.isp,
        'MAC': apiUsage.mac
    };
}

// Call this in browser console to see stats
window.showAPIUsage = function() {
    console.table(getUsageStats());
};

// Add CSS animation for warnings
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================================
// WORKER HEALTH CHECK
// ============================================
let workerAvailable = false;

async function checkWorkerHealth() {
    if (!WORKER_URL) {
        console.warn('⚠️ Worker URL not configured');
        return false;
    }

    try {
        const response = await fetch(`${WORKER_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
                workerAvailable = true;
                if (CONFIG.DEBUG) console.log('✅ Worker is online and ready');
                return true;
            }
        }
    } catch (error) {
        console.error('❌ Worker health check failed:', error);
    }
    
    workerAvailable = false;
    return false;
}

// Check worker health on page load
window.addEventListener('DOMContentLoaded', async function() {
    // Load saved theme
    const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
    changeTheme(savedTheme);
    
    // Track form load time (anti-spam)
    const loadTimeField = document.getElementById('formLoadTime');
    if (loadTimeField) {
        loadTimeField.value = Date.now();
    }
    
    await checkWorkerHealth();
    
    // Initialize other features
    initializeEncryptedNotes();
    loadSavedNotes();
    
    // Initialize drag and drop
    initDragAndDrop();
    
    // Load saved tool order
    loadToolOrder();
    
    // Ensure all tools are visible and checkboxes checked on load
    const checkboxes = document.querySelectorAll('[id^="toggle-"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const toolId = checkbox.id.replace('toggle-', '');
        const tool = document.getElementById(toolId);
        if (tool) {
            tool.classList.remove('hidden');
        }
    });
    
    // Set button to "Hide All" since all are visible
    const btn = document.getElementById('toggleAllBtn');
    if (btn) {
        const icon = btn.querySelector('.toggle-icon');
        const text = btn.querySelector('.toggle-text');
        if (icon) icon.classList.remove('eye-closed');
        if (text) text.textContent = 'Hide All';
    }
});

// ============================================
// HELPER FUNCTION: CALL WORKER
// ============================================
async function callWorker(tool, data) {
    if (!WORKER_URL) {
        throw new Error('Worker URL not configured. Please check configuration.');
    }

    // Check cache first
    const cached = getCache(tool, data);
    if (cached !== null) {
        if (CONFIG.DEBUG) console.log(`⚡ Using cached response for ${tool}`);
        return cached;
    }

    // Check client-side rate limit before making request
    if (isRateLimited(tool)) {
        const secs = getSecondsUntilReset();
        const blockType = apiUsage.blocked[tool];
        if (blockType === 'day') {
            throw new Error(`Daily limit reached for ${tool.toUpperCase()}. Please try again tomorrow.`);
        }
        showRateLimitCountdown(tool);
        throw new Error(`Rate limit reached. Try again in ${secs} seconds.`);
    }

    trackAPICall(tool);

    if (CONFIG.DEBUG) console.log(`🔧 Calling worker tool: ${tool}`, data);

    const response = await fetch(`${WORKER_URL}?tool=${tool}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (CONFIG.DEBUG) console.log(`📡 Worker response status: ${response.status}`);

    if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        // Server-side rate limit — show countdown too
        showRateLimitCountdown(tool);
        throw new Error(errorData.message || 'Rate limit exceeded. Please wait a moment.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Worker error:', errorData);
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    const result = await response.json();
    if (CONFIG.DEBUG) console.log(`✅ Worker result:`, result);
    
    if (result.error) {
        throw new Error(result.message || 'Unknown error occurred');
    }

    // Cache the successful response
    setCache(tool, data, result.data);

    return result.data;
}

// ============================================
// TOAST NOTIFICATION SYSTEM (replaces alert())
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
