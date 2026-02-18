// ============================================
// DUCKTYPED — SHARED BACKEND UTILITIES
// Response helpers, input sanitization, SSRF protection
// ============================================
//
// CACHE TTL REFERENCE (seconds):
//   network.js  — stdTTL 300 (5 min for ping/ports/traceroute)
//                  dns: 3600, mac: 2592000 (30d), isp: 86400 (24h)
//   security.js — stdTTL 3600 (1h), whois: 86400 (24h)
//   email.js    — stdTTL 3600 (1h)
//   web.js      — stdTTL 3600 (1h)
//

const { URL } = require('url');
const dns = require('dns');
const { promisify } = require('util');

const dnsResolve = promisify(dns.resolve4);

// ============================================
// RESPONSE HELPERS
// ============================================
function success(data) { return { error: false, data }; }
function fail(msg) { return { error: true, message: msg }; }

// ============================================
// INPUT SANITIZATION
// ============================================
function sanitizeHost(input) {
    if (!input) return null;
    const cleaned = input.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/[^a-z0-9.\-:]/g, '');
    if (cleaned.length > 253 || cleaned.length === 0) return null;
    return cleaned;
}

// ============================================
// SSRF PROTECTION — URL VALIDATION
// ============================================

// Private/internal IP ranges that should never be requested server-side
const BLOCKED_IP_RANGES = [
    /^127\./,                          // Loopback
    /^10\./,                           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12
    /^192\.168\./,                     // 192.168.0.0/16
    /^169\.254\./,                     // Link-local
    /^0\./,                            // 0.0.0.0/8
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGN 100.64.0.0/10
    /^198\.1[89]\./,                   // Benchmarking 198.18.0.0/15
    /^::1$/,                           // IPv6 loopback
    /^fc/i,                            // IPv6 unique local
    /^fd/i,                            // IPv6 unique local
    /^fe80/i,                          // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',        // GCP metadata
    'metadata.google',
    '169.254.169.254',                 // AWS/GCP/Azure metadata
    'metadata',
];

function isBlockedIP(ip) {
    return BLOCKED_IP_RANGES.some(range => range.test(ip));
}

/**
 * Validate a URL for safe server-side fetching (SSRF protection).
 * Returns { valid: true, url: normalizedUrl } or { valid: false, reason: string }
 */
async function validateUrl(input, { requireScheme = false, maxLength = 2048 } = {}) {
    if (!input || typeof input !== 'string') {
        return { valid: false, reason: 'URL required' };
    }

    const trimmed = input.trim();
    if (trimmed.length > maxLength) {
        return { valid: false, reason: `URL too long (max ${maxLength} characters)` };
    }

    // Auto-add scheme if missing
    let urlStr = trimmed;
    if (!/^https?:\/\//i.test(urlStr)) {
        if (requireScheme) {
            return { valid: false, reason: 'URL must start with http:// or https://' };
        }
        urlStr = 'https://' + urlStr;
    }

    // Parse URL
    let parsed;
    try {
        parsed = new URL(urlStr);
    } catch (e) {
        return { valid: false, reason: 'Invalid URL format' };
    }

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, reason: 'Only http:// and https:// URLs are allowed' };
    }

    // Block known dangerous hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
        return { valid: false, reason: 'This hostname is not allowed' };
    }

    // Check if hostname is an IP literal
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        if (isBlockedIP(hostname)) {
            return { valid: false, reason: 'Private/internal IP addresses are not allowed' };
        }
    } else {
        // Resolve hostname to check for SSRF via DNS rebinding to private IPs
        try {
            const addresses = await dnsResolve(hostname);
            if (addresses.some(ip => isBlockedIP(ip))) {
                return { valid: false, reason: 'This domain resolves to a private/internal IP address' };
            }
        } catch (e) {
            // DNS resolution failed — let the actual request fail naturally
        }
    }

    return { valid: true, url: urlStr };
}

module.exports = { success, fail, sanitizeHost, validateUrl, isBlockedIP };
