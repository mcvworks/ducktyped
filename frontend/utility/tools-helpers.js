// ============================================
// QUACKTOOLS — SHARED TOOL HELPERS
// HTML builders, validation, boilerplate reducers
// ============================================

// ============================================
// RESULT HTML BUILDERS
// ============================================

/**
 * Build a single result row (replaces repeated dns-record HTML pattern).
 * @param {string} icon - Emoji icon
 * @param {string} label - Bold label
 * @param {string} value - HTML content for the value
 * @param {string} [colorClass] - Optional: 'text-success', 'text-warning', 'text-error', 'text-muted'
 */
function resultRow(icon, label, value, colorClass) {
    const cls = colorClass ? ` class="${colorClass}"` : '';
    return `<div class="dns-record"><strong>${icon} ${escapeHtml(label)}</strong><div class="dns-record-value"${cls}>${value}</div></div>`;
}

/**
 * Build a result section heading.
 */
function resultHeading(text) {
    return `<div class="result-heading"><strong>${escapeHtml(text)}</strong></div>`;
}

/**
 * Build a summary box with optional border color variant.
 * @param {string} html - Inner HTML content
 * @param {'success'|'warning'|'error'|''} [variant] - Border color variant
 */
function resultSummary(html, variant) {
    const cls = variant ? ` ${variant}-border` : '';
    return `<div class="result-summary${cls}">${html}</div>`;
}

/**
 * Build a note/info box.
 * @param {string} html - Inner HTML content
 * @param {'warning'|'error'|''} [variant] - Optional variant
 */
function resultNote(html, variant) {
    const cls = variant ? ` ${variant}` : '';
    return `<div class="result-note${cls}">${html}</div>`;
}

/**
 * Wrap content in a dns-results container.
 */
function resultWrap(innerHtml) {
    return `<div class="dns-results">${innerHtml}</div>`;
}

// ============================================
// TOOL RUNNER — reduces boilerplate for worker-backed tools
// ============================================

/**
 * Run a worker-backed tool with standard validation, loading state, and error handling.
 * @param {object} opts
 * @param {string} opts.inputId - ID of the input element
 * @param {string} opts.resultsId - ID of the results container
 * @param {string} opts.tool - Worker tool name (e.g. 'dns', 'whois')
 * @param {function} opts.getPayload - (inputValue) => request body object
 * @param {function} opts.render - (data, inputValue) => HTML string
 * @param {string} [opts.loadingMsg] - Loading message
 * @param {string} [opts.errorPrefix] - Error message prefix
 * @param {function} [opts.validate] - (inputValue) => error string or null
 * @param {boolean} [opts.requireWorker=true] - Whether worker must be available
 */
async function runTool(opts) {
    const input = document.getElementById(opts.inputId);
    const resultsDiv = document.getElementById(opts.resultsId);
    const value = input ? input.value.trim() : '';

    if (!value) {
        resultsDiv.innerHTML = '<div class="error">Please enter a value!</div>';
        return;
    }

    // Custom validation
    if (opts.validate) {
        const err = opts.validate(value);
        if (err) {
            resultsDiv.innerHTML = `<div class="error">${escapeHtml(err)}</div>`;
            return;
        }
    }

    // Worker availability check
    if (opts.requireWorker !== false && !workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = `<div class="success">${opts.loadingMsg || 'Processing...'}</div>`;

    try {
        const payload = opts.getPayload(value);
        const data = await callWorker(opts.tool, payload);
        resultsDiv.innerHTML = opts.render(data, value);
    } catch (error) {
        const prefix = opts.errorPrefix || 'Error';
        resultsDiv.innerHTML = `<div class="error">${prefix}: ${escapeHtml(error.message)}</div>`;
    }
}

// ============================================
// COMMON VALIDATORS
// ============================================

function validateUrlInput(value) {
    try {
        new URL(value);
        return null;
    } catch (e) {
        return 'Invalid URL format! Please include http:// or https://';
    }
}

function validateIpInput(value) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return 'Invalid IP format! Please enter a valid IPv4 address (e.g., 203.0.113.1)';
    }
    return null;
}
