// ============================================
// DUCKTYPED — Dev Tools
// Base64, URL Encode, JSON, Regex, Hash, JWT, Timestamp, Color
// ============================================

// ============================================
// BASE64 ENCODE/DECODE
// ============================================
function encodeBase64() {
    const input = document.getElementById('base64Input').value;
    const resultsDiv = document.getElementById('base64Results');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter text to encode!</div>'; return; }
    try {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        resultsDiv.innerHTML = resultHeading('Encoded Base64') +
            '<div class="output-box" style="font-family: var(--font-mono); font-size: 0.88em; word-break: break-all; padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px; position: relative;">' +
            escapeHtml(encoded) +
            '<button class="copy-btn" onclick="navigator.clipboard.writeText(\'' + encoded.replace(/'/g, "\\'") + '\'); showToast(\'Copied!\');" style="position: absolute; top: 8px; right: 8px; padding: 4px 10px; font-size: 0.8em; min-width: auto; width: auto; margin: 0;">Copy</button>' +
            '</div>';
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Encoding failed: ' + escapeHtml(e.message) + '</div>';
    }
}

function decodeBase64() {
    const input = document.getElementById('base64Input').value.trim();
    const resultsDiv = document.getElementById('base64Results');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter Base64 to decode!</div>'; return; }
    try {
        const decoded = decodeURIComponent(escape(atob(input)));
        resultsDiv.innerHTML = resultHeading('Decoded Text') +
            '<div class="output-box" style="font-family: var(--font-mono); font-size: 0.88em; white-space: pre-wrap; word-break: break-word; padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px;">' +
            escapeHtml(decoded) + '</div>';
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid Base64 string. Make sure the input is valid Base64-encoded data.</div>';
    }
}

// ============================================
// URL ENCODE/DECODE
// ============================================
function encodeURL() {
    const input = document.getElementById('urlEncodeInput').value;
    const resultsDiv = document.getElementById('urlEncodeResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter text to encode!</div>'; return; }
    try {
        const encoded = encodeURIComponent(input);
        resultsDiv.innerHTML = resultHeading('URL-Encoded') +
            '<div class="output-box" style="font-family: var(--font-mono); font-size: 0.88em; word-break: break-all; padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px; position: relative;">' +
            escapeHtml(encoded) +
            '<button class="copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent(\'' + encoded.replace(/'/g, "%27") + '\')); showToast(\'Copied!\');" style="position: absolute; top: 8px; right: 8px; padding: 4px 10px; font-size: 0.8em; min-width: auto; width: auto; margin: 0;">Copy</button>' +
            '</div>';
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Encoding failed: ' + escapeHtml(e.message) + '</div>';
    }
}

function decodeURL() {
    const input = document.getElementById('urlEncodeInput').value.trim();
    const resultsDiv = document.getElementById('urlEncodeResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter an encoded string to decode!</div>'; return; }
    try {
        const decoded = decodeURIComponent(input);
        resultsDiv.innerHTML = resultHeading('Decoded Text') +
            '<div class="output-box" style="font-family: var(--font-mono); font-size: 0.88em; white-space: pre-wrap; word-break: break-word; padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px;">' +
            escapeHtml(decoded) + '</div>';
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid encoded string. The input contains malformed percent-encoding.</div>';
    }
}

// ============================================
// JSON FORMATTER / VALIDATOR
// ============================================
function formatJSON() {
    const input = document.getElementById('jsonInput').value.trim();
    const resultsDiv = document.getElementById('jsonResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter JSON to format!</div>'; return; }
    try {
        const parsed = JSON.parse(input);
        const formatted = JSON.stringify(parsed, null, 2);
        const highlighted = syntaxHighlightJSON(formatted);
        resultsDiv.innerHTML = resultHeading('Formatted JSON') +
            '<div class="json-output">' + highlighted + '</div>' +
            '<button onclick="navigator.clipboard.writeText(JSON.stringify(JSON.parse(document.getElementById(\'jsonInput\').value.trim()), null, 2)); showToast(\'Copied!\');" style="margin-top: 10px;">Copy Formatted</button>';
    } catch (e) {
        const msg = e.message;
        resultsDiv.innerHTML = '<div class="error"><strong>Invalid JSON</strong><br>' + escapeHtml(msg) + '</div>';
    }
}

function minifyJSON() {
    const input = document.getElementById('jsonInput').value.trim();
    const resultsDiv = document.getElementById('jsonResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter JSON to minify!</div>'; return; }
    try {
        const parsed = JSON.parse(input);
        const minified = JSON.stringify(parsed);
        resultsDiv.innerHTML = resultHeading('Minified JSON') +
            '<div style="font-family: var(--font-mono); font-size: 0.85em; word-break: break-all; padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px; max-height: 300px; overflow: auto;">' +
            escapeHtml(minified) + '</div>' +
            '<div style="margin-top: 8px; font-size: 0.85em; color: var(--text-secondary);">Original: ' + input.length.toLocaleString() + ' chars → Minified: ' + minified.length.toLocaleString() + ' chars (' + Math.round((1 - minified.length / input.length) * 100) + '% smaller)</div>' +
            '<button onclick="navigator.clipboard.writeText(JSON.stringify(JSON.parse(document.getElementById(\'jsonInput\').value.trim()))); showToast(\'Copied!\');" style="margin-top: 10px;">Copy Minified</button>';
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error"><strong>Invalid JSON</strong><br>' + escapeHtml(e.message) + '</div>';
    }
}

function syntaxHighlightJSON(json) {
    return escapeHtml(json).replace(
        /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        }
    );
}

// ============================================
// REGEX TESTER
// ============================================
function testRegex() {
    const pattern = document.getElementById('regexPattern').value;
    const flags = document.getElementById('regexFlags').value;
    const testStr = document.getElementById('regexTestString').value;
    const resultsDiv = document.getElementById('regexResults');

    if (!pattern) { resultsDiv.innerHTML = ''; return; }
    if (!testStr) { resultsDiv.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9em; margin-top: 10px;">Enter a test string to see matches.</div>'; return; }

    try {
        const regex = new RegExp(pattern, flags);
        const matches = [];
        let match;

        if (flags.includes('g')) {
            while ((match = regex.exec(testStr)) !== null) {
                matches.push({ index: match.index, length: match[0].length, value: match[0], groups: match.slice(1) });
                if (match[0].length === 0) { regex.lastIndex++; }
            }
        } else {
            match = regex.exec(testStr);
            if (match) {
                matches.push({ index: match.index, length: match[0].length, value: match[0], groups: match.slice(1) });
            }
        }

        let html = '';

        // Match count
        const countColor = matches.length > 0 ? 'var(--success-color)' : 'var(--error-color)';
        html += '<div style="margin: 12px 0 8px; font-weight: 600; color: ' + countColor + ';">' + matches.length + ' match' + (matches.length !== 1 ? 'es' : '') + ' found</div>';

        // Highlighted text
        if (matches.length > 0) {
            let highlighted = '';
            let lastIndex = 0;
            matches.forEach(function(m) {
                highlighted += escapeHtml(testStr.substring(lastIndex, m.index));
                highlighted += '<mark class="regex-match">' + escapeHtml(testStr.substring(m.index, m.index + m.length)) + '</mark>';
                lastIndex = m.index + m.length;
            });
            highlighted += escapeHtml(testStr.substring(lastIndex));
            html += '<div class="regex-output" style="padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px;">' + highlighted + '</div>';

            // Match details
            html += '<div style="margin-top: 12px;"><strong style="font-size: 0.9em;">Match Details:</strong></div>';
            html += '<div class="dns-results" style="margin-top: 6px;">';
            matches.forEach(function(m, i) {
                html += '<div class="dns-record"><strong>Match ' + (i + 1) + '</strong>';
                html += '<div class="dns-record-value" style="font-family: var(--font-mono); font-size: 0.88em;">';
                html += '"' + escapeHtml(m.value) + '" <span class="text-muted">at index ' + m.index + '</span>';
                if (m.groups.length > 0) {
                    html += '<br>';
                    m.groups.forEach(function(g, gi) {
                        html += 'Group ' + (gi + 1) + ': ' + (g !== undefined ? '"' + escapeHtml(g) + '"' : '<span class="text-muted">undefined</span>') + '<br>';
                    });
                }
                html += '</div></div>';
            });
            html += '</div>';
        } else {
            html += '<div style="padding: 14px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-secondary);">No matches found in the test string.</div>';
        }

        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error"><strong>Invalid Regex</strong><br>' + escapeHtml(e.message) + '</div>';
    }
}

// ============================================
// HASH GENERATOR (Web Crypto API)
// ============================================
async function generateHashes() {
    const input = document.getElementById('hashInput').value;
    const resultsDiv = document.getElementById('hashResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter text to hash!</div>'; return; }

    resultsDiv.innerHTML = '<div class="success">Generating hashes...</div>';

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        const results = await Promise.all(algos.map(async function(algo) {
            const hashBuffer = await crypto.subtle.digest(algo, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return { algo: algo, hash: hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('') };
        }));

        let html = resultHeading('Hash Results');
        results.forEach(function(r) {
            html += '<div class="hash-result-row">' +
                '<span class="hash-algo">' + r.algo + '</span>' +
                '<span class="hash-value" id="hash-' + r.algo.replace('-', '') + '">' + r.hash + '</span>' +
                '<button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById(\'hash-' + r.algo.replace('-', '') + '\').textContent); showToast(\'Copied!\');" style="padding: 4px 10px; font-size: 0.8em; min-width: auto; width: auto; margin: 0;">Copy</button>' +
                '</div>';
        });
        html += '<div style="margin-top: 10px; font-size: 0.85em; color: var(--text-secondary);">All hashes generated locally using Web Crypto API. Input: ' + input.length.toLocaleString() + ' characters.</div>';
        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Hashing failed: ' + escapeHtml(e.message) + '</div>';
    }
}

// ============================================
// JWT DECODER
// ============================================
function decodeJWT() {
    const input = document.getElementById('jwtInput').value.trim();
    const resultsDiv = document.getElementById('jwtResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter a JWT token!</div>'; return; }

    try {
        const parts = input.split('.');
        if (parts.length !== 3) {
            resultsDiv.innerHTML = '<div class="error">Invalid JWT format. A JWT must have 3 parts separated by dots (header.payload.signature).</div>';
            return;
        }

        function base64urlDecode(str) {
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) str += '=';
            return decodeURIComponent(escape(atob(str)));
        }

        const header = JSON.parse(base64urlDecode(parts[0]));
        const payload = JSON.parse(base64urlDecode(parts[1]));

        let html = resultHeading('Decoded JWT');
        html += '<div class="dns-results">';

        // Header
        html += '<div class="dns-record"><strong>Header</strong>';
        html += '<div class="dns-record-value"><div class="json-output" style="max-height: 200px;">' + syntaxHighlightJSON(JSON.stringify(header, null, 2)) + '</div></div></div>';

        // Payload
        html += '<div class="dns-record"><strong>Payload</strong>';
        html += '<div class="dns-record-value"><div class="json-output" style="max-height: 300px;">' + syntaxHighlightJSON(JSON.stringify(payload, null, 2)) + '</div></div></div>';

        // Expiration
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const isExpired = Date.now() > payload.exp * 1000;
            const icon = isExpired ? '❌' : '✅';
            const color = isExpired ? 'var(--error-color)' : 'var(--success-color)';
            html += '<div class="dns-record"><strong>' + icon + ' Expiration</strong>';
            html += '<div class="dns-record-value" style="color: ' + color + ';">' + (isExpired ? 'EXPIRED' : 'Valid') + ' — ' + escapeHtml(expDate.toUTCString()) + '</div></div>';
        }

        // Issued At
        if (payload.iat) {
            const iatDate = new Date(payload.iat * 1000);
            html += '<div class="dns-record"><strong>Issued At</strong>';
            html += '<div class="dns-record-value">' + escapeHtml(iatDate.toUTCString()) + '</div></div>';
        }

        // Signature
        html += '<div class="dns-record"><strong>Signature</strong>';
        html += '<div class="dns-record-value" style="font-family: var(--font-mono); font-size: 0.85em; word-break: break-all; color: var(--text-secondary);">' + escapeHtml(parts[2]) + '</div></div>';

        html += '</div>';
        html += resultNote('<strong>Note:</strong> This decoder does not verify the signature. It only decodes and displays the token contents. Signature verification requires the signing key.', '');
        resultsDiv.innerHTML = html;
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Failed to decode JWT. The token may be malformed or contain invalid Base64.</div>';
    }
}

// ============================================
// UNIX TIMESTAMP CONVERTER
// ============================================
var _timestampInterval = null;

function startLiveClock() {
    var el = document.getElementById('timestampLive');
    if (!el) return;
    function update() {
        var now = Math.floor(Date.now() / 1000);
        el.innerHTML = 'Current Epoch: <strong>' + now + '</strong>';
    }
    update();
    if (_timestampInterval) clearInterval(_timestampInterval);
    _timestampInterval = setInterval(update, 1000);
}

function convertTimestamp() {
    var input = document.getElementById('timestampInput').value.trim();
    var resultsDiv = document.getElementById('timestampResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please enter a Unix timestamp!</div>'; return; }

    var ts = Number(input);
    if (isNaN(ts)) { resultsDiv.innerHTML = '<div class="error">Invalid timestamp. Enter a numeric value.</div>'; return; }

    // Auto-detect seconds vs milliseconds
    var isMs = ts > 9999999999;
    var date = new Date(isMs ? ts : ts * 1000);

    if (isNaN(date.getTime())) { resultsDiv.innerHTML = '<div class="error">Invalid timestamp value.</div>'; return; }

    var rows = '';
    rows += resultRow('📅', 'UTC', escapeHtml(date.toUTCString()));
    rows += resultRow('🕐', 'Local', escapeHtml(date.toLocaleString()));
    rows += resultRow('📋', 'ISO 8601', escapeHtml(date.toISOString()));
    rows += resultRow('⏱️', 'Seconds', String(Math.floor(date.getTime() / 1000)));
    rows += resultRow('⚡', 'Milliseconds', String(date.getTime()));
    if (isMs) {
        rows += resultRow('ℹ️', 'Detected', '<span class="text-muted">Input treated as milliseconds (>10 digits)</span>');
    }

    var relStr = getRelativeTime(date);
    rows += resultRow('🔄', 'Relative', relStr);

    resultsDiv.innerHTML = resultHeading('Timestamp → Date') + resultWrap(rows);
}

function convertDateToTimestamp() {
    var input = document.getElementById('dateInput').value;
    var resultsDiv = document.getElementById('timestampResults');
    if (!input) { resultsDiv.innerHTML = '<div class="error">Please select a date and time!</div>'; return; }

    var date = new Date(input);
    if (isNaN(date.getTime())) { resultsDiv.innerHTML = '<div class="error">Invalid date value.</div>'; return; }

    var seconds = Math.floor(date.getTime() / 1000);
    var millis = date.getTime();

    var rows = '';
    rows += resultRow('⏱️', 'Seconds', '<strong>' + seconds + '</strong>');
    rows += resultRow('⚡', 'Milliseconds', String(millis));
    rows += resultRow('📅', 'UTC', escapeHtml(date.toUTCString()));
    rows += resultRow('📋', 'ISO 8601', escapeHtml(date.toISOString()));

    resultsDiv.innerHTML = resultHeading('Date → Timestamp') + resultWrap(rows);
}

function getRelativeTime(date) {
    var now = Date.now();
    var diff = now - date.getTime();
    var abs = Math.abs(diff);
    var suffix = diff > 0 ? 'ago' : 'from now';
    if (abs < 60000) return Math.floor(abs / 1000) + ' seconds ' + suffix;
    if (abs < 3600000) return Math.floor(abs / 60000) + ' minutes ' + suffix;
    if (abs < 86400000) return Math.floor(abs / 3600000) + ' hours ' + suffix;
    if (abs < 2592000000) return Math.floor(abs / 86400000) + ' days ' + suffix;
    if (abs < 31536000000) return Math.floor(abs / 2592000000) + ' months ' + suffix;
    return Math.floor(abs / 31536000000) + ' years ' + suffix;
}

// ============================================
// COLOR CONVERTER
// ============================================
function convertColor() {
    var input = document.getElementById('colorInput').value.trim();
    var resultsDiv = document.getElementById('colorResults');
    if (!input) { resultsDiv.innerHTML = ''; return; }

    var rgb = parseColorToRgb(input);
    if (!rgb) {
        resultsDiv.innerHTML = '<div class="error">Could not parse color. Try formats like: #FF6600, rgb(255,102,0), hsl(24,100%,50%)</div>';
        return;
    }

    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Sync color picker
    var picker = document.getElementById('colorPicker');
    if (picker) picker.value = hex;

    renderColorResults(hex, rgb, hsl, resultsDiv);
}

function updateColorFromPicker() {
    var picker = document.getElementById('colorPicker');
    var input = document.getElementById('colorInput');
    if (picker && input) {
        input.value = picker.value;
        convertColor();
    }
}

function parseColorToRgb(input) {
    // HEX
    var hexMatch = input.match(/^#?([0-9a-f]{3,8})$/i);
    if (hexMatch) {
        var h = hexMatch[1];
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (h.length === 6 || h.length === 8) {
            return { r: parseInt(h.substring(0,2), 16), g: parseInt(h.substring(2,4), 16), b: parseInt(h.substring(4,6), 16) };
        }
    }
    // RGB
    var rgbMatch = input.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (rgbMatch) {
        return { r: Math.min(255, +rgbMatch[1]), g: Math.min(255, +rgbMatch[2]), b: Math.min(255, +rgbMatch[3]) };
    }
    // HSL
    var hslMatch = input.match(/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/i);
    if (hslMatch) {
        return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3]);
    }
    // Named colors via canvas
    try {
        var ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = input;
        var computed = ctx.fillStyle;
        if (computed.startsWith('#')) {
            return parseColorToRgb(computed);
        }
    } catch(e) {}
    return null;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function(x) { return x.toString(16).padStart(2, '0'); }).join('');
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function renderColorResults(hex, rgb, hsl, resultsDiv) {
    var hexUpper = hex.toUpperCase();
    var rgbStr = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    var hslStr = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

    // Determine text color for contrast
    var lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    var textColor = lum > 0.5 ? '#000' : '#fff';

    var html = '<div class="color-preview-swatch" style="background-color: ' + hex + '; display: flex; align-items: center; justify-content: center; color: ' + textColor + '; font-weight: 700; font-size: 1.1em;">' + hexUpper + '</div>';
    html += '<div class="color-values-grid">';
    html += colorValueRow('HEX', hexUpper, 'colorHex');
    html += colorValueRow('RGB', rgbStr, 'colorRgb');
    html += colorValueRow('HSL', hslStr, 'colorHsl');
    html += '</div>';
    resultsDiv.innerHTML = html;
}

function colorValueRow(label, value, id) {
    return '<div class="color-value-row">' +
        '<strong style="min-width: 36px; color: var(--primary-color);">' + label + '</strong>' +
        '<span id="' + id + '" style="flex: 1;">' + value + '</span>' +
        '<button onclick="navigator.clipboard.writeText(document.getElementById(\'' + id + '\').textContent); showToast(\'Copied!\');" style="padding: 4px 10px; font-size: 0.8em; min-width: auto; width: auto; margin: 0;">Copy</button>' +
        '</div>';
}

// Auto-start live clock if element exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { startLiveClock(); });
} else {
    startLiveClock();
}
