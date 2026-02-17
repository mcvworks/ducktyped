// ============================================
// QUACKTOOLS — URL Tools
// Safety, Redirect, Broken Link, Metadata
// ============================================

// URL TOOLS
// ============================================

// URL Safety Checker
async function checkURLSafety() {
    const url = document.getElementById('urlToCheck').value.trim();
    const resultsDiv = document.getElementById('urlSafetyResults');
    
    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include http:// or https://</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div class="success">🔍 Checking URL safety...</div>';
    
    try {
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Safety Check Results</strong></div>';
        html += '<div class="dns-results">';
        
        const urlObj = new URL(url);
        
        // 1. Protocol Check
        const isHTTPS = urlObj.protocol === 'https:';
        html += `<div class="dns-record">`;
        html += `<strong>${isHTTPS ? '✅' : '⚠️'} SSL/HTTPS</strong>`;
        html += `<div class="dns-record-value" style="color: ${isHTTPS ? 'var(--success-color)' : 'var(--warning-color)'};">`;
        html += isHTTPS ? 'Secure HTTPS connection' : 'Warning: Not using HTTPS';
        html += `</div></div>`;
        
        // 2. Domain Pattern Check
        const suspiciousPatterns = [
            { pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, name: 'IP address instead of domain' },
            { pattern: /-{2,}/, name: 'Multiple consecutive hyphens' },
            { pattern: /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$/i, name: 'Free domain extension (common in phishing)' },
            { pattern: /[0-9]{5,}/, name: 'Long number sequences' },
            { pattern: /\@/, name: 'Contains @ symbol (URL trick)' }
        ];
        
        let suspiciousFound = false;
        suspiciousPatterns.forEach(check => {
            if (check.pattern.test(url)) {
                suspiciousFound = true;
                html += `<div class="dns-record">`;
                html += `<strong>⚠️ Pattern Warning</strong>`;
                html += `<div class="dns-record-value" style="color: var(--warning-color);">`;
                html += `Detected: ${check.name}`;
                html += `</div></div>`;
            }
        });
        
        if (!suspiciousFound) {
            html += `<div class="dns-record">`;
            html += `<strong>✅ URL Pattern</strong>`;
            html += `<div class="dns-record-value" style="color: var(--success-color);">No suspicious patterns detected</div>`;
            html += `</div>`;
        }
        
        // 3. Domain Length Check
        const domainLength = urlObj.hostname.length;
        const isReasonableLength = domainLength < 60;
        html += `<div class="dns-record">`;
        html += `<strong>${isReasonableLength ? '✅' : '⚠️'} Domain Length</strong>`;
        html += `<div class="dns-record-value" style="color: ${isReasonableLength ? 'var(--success-color)' : 'var(--warning-color)'};">`;
        html += `${domainLength} characters ${!isReasonableLength ? '(unusually long)' : ''}`;
        html += `</div></div>`;
        
        // 4. Homograph Attack Check (lookalike characters)
        const hasSuspiciousChars = /[а-яА-Я]|[α-ωΑ-Ω]/.test(urlObj.hostname);
        html += `<div class="dns-record">`;
        html += `<strong>${!hasSuspiciousChars ? '✅' : '⚠️'} Character Set</strong>`;
        html += `<div class="dns-record-value" style="color: ${!hasSuspiciousChars ? 'var(--success-color)' : 'var(--warning-color)'};">`;
        html += hasSuspiciousChars ? 'Contains non-Latin characters (possible homograph attack)' : 'Standard Latin characters';
        html += `</div></div>`;
        
        // 5. Port Check
        const port = urlObj.port;
        const hasUnusualPort = port && port !== '80' && port !== '443';
        if (hasUnusualPort) {
            html += `<div class="dns-record">`;
            html += `<strong>⚠️ Unusual Port</strong>`;
            html += `<div class="dns-record-value" style="color: var(--warning-color);">Using port ${port} (non-standard)</div>`;
            html += `</div>`;
        }
        
        html += '</div>';
        
        // Summary
        const warningCount = (suspiciousFound ? 1 : 0) + (!isHTTPS ? 1 : 0) + (!isReasonableLength ? 1 : 0) + 
                            (hasSuspiciousChars ? 1 : 0) + (hasUnusualPort ? 1 : 0);
        
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid ${warningCount === 0 ? 'var(--success-color)' : warningCount <= 2 ? 'var(--warning-color)' : 'var(--error-color)'};">`;
        html += `<strong>Overall Assessment:</strong><br>`;
        if (warningCount === 0) {
            html += `<span style="color: var(--success-color);">✅ URL appears safe - no warnings detected</span>`;
        } else if (warningCount <= 2) {
            html += `<span style="color: var(--warning-color);">⚠️ ${warningCount} warning(s) - proceed with caution</span>`;
        } else {
            html += `<span style="color: var(--error-color);">🚨 ${warningCount} warnings - high risk URL</span>`;
        }
        html += `</div>`;
        
        // Disclaimer
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>Note:</strong> This is a basic pattern-based check. For comprehensive malware/phishing detection, use dedicated security services like Google Safe Browsing or VirusTotal.`;
        html += `</p></div>`;
        
        resultsDiv.innerHTML = html;
        
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error checking URL: ${error.message}</div>`;
    }
}

// URL Redirect Checker
async function checkRedirects() {
    const url = document.getElementById('urlToTrace').value.trim();
    const resultsDiv = document.getElementById('urlRedirectResults');
    
    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }
    
    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include http:// or https://</div>';
        return;
    }
    
    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div class="success">🔄 Tracing redirects...</div>';
    
    try {
        const data = await callWorker('redirect', { url });
        
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Redirect Chain</strong></div>';
        
        if (data.redirects && data.redirects.length > 0) {
            html += '<div class="dns-results">';
            
            data.redirects.forEach((redirect, index) => {
                html += `<div class="dns-record">`;
                html += `<strong>Step ${index + 1}: ${redirect.status || 'N/A'}</strong>`;
                html += `<div class="dns-record-value" style="word-break: break-all;">`;
                html += escapeHtml(redirect.url);
                html += `</div></div>`;
            });
            
            html += '</div>';
            
            html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px;">`;
            html += `<strong>Summary:</strong> ${data.redirects.length} redirect(s) detected<br>`;
            html += `Final destination: <span style="color: var(--success-color);">${data.finalUrl || data.redirects[data.redirects.length - 1].url}</span>`;
            html += `</div>`;
        } else {
            html += '<div class="success">✅ No redirects - URL loads directly</div>';
            html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px;">`;
            html += `Direct URL: <span style="color: var(--success-color);">${url}</span>`;
            html += `</div>`;
        }
        
        resultsDiv.innerHTML = html;
        
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error tracing redirects: ${error.message}</div>`;
    }
}

// Broken Link Checker
async function checkLinkStatus() {
    const url = document.getElementById('urlToTest').value.trim();
    const resultsDiv = document.getElementById('urlStatusResults');
    
    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }
    
    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include http:// or https://</div>';
        return;
    }
    
    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div class="success">⏳ Checking link status...</div>';
    
    const startTime = Date.now();
    
    try {
        const data = await callWorker('urlstatus', { url });
        const responseTime = Date.now() - startTime;
        
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Link Status Results</strong></div>';
        html += '<div class="dns-results">';
        
        // Status Code
        const statusCode = data.status || 0;
        let statusColor = 'var(--success-color)';
        let statusIcon = '✅';
        let statusText = 'Working';
        
        if (statusCode >= 400) {
            statusColor = 'var(--error-color)';
            statusIcon = '❌';
            statusText = 'Broken';
        } else if (statusCode >= 300) {
            statusColor = 'var(--warning-color)';
            statusIcon = '🔄';
            statusText = 'Redirect';
        }
        
        html += `<div class="dns-record">`;
        html += `<strong>${statusIcon} HTTP Status</strong>`;
        html += `<div class="dns-record-value" style="color: ${statusColor};">`;
        html += `${statusCode} - ${statusText}`;
        html += `</div></div>`;
        
        // Response Time
        html += `<div class="dns-record">`;
        html += `<strong>⏱️ Response Time</strong>`;
        html += `<div class="dns-record-value" style="color: var(--text-secondary);">`;
        html += `${responseTime}ms`;
        html += `</div></div>`;
        
        // Server Info
        if (data.server) {
            html += `<div class="dns-record">`;
            html += `<strong>🖥️ Server</strong>`;
            html += `<div class="dns-record-value" style="color: var(--text-secondary);">${escapeHtml(data.server)}</div>`;
            html += `</div>`;
        }
        
        // Content Type
        if (data.contentType) {
            html += `<div class="dns-record">`;
            html += `<strong>📄 Content Type</strong>`;
            html += `<div class="dns-record-value" style="color: var(--text-secondary);">${escapeHtml(data.contentType)}</div>`;
            html += `</div>`;
        }
        
        html += '</div>';
        
        // Summary
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid ${statusColor};">`;
        html += `<strong>Summary:</strong> `;
        if (statusCode >= 200 && statusCode < 300) {
            html += `<span style="color: var(--success-color);">✅ Link is working properly</span>`;
        } else if (statusCode >= 300 && statusCode < 400) {
            html += `<span style="color: var(--warning-color);">🔄 Link redirects to another location</span>`;
        } else if (statusCode >= 400) {
            html += `<span style="color: var(--error-color);">❌ Link is broken (${statusCode} error)</span>`;
        } else {
            html += `<span style="color: var(--text-secondary);">Cannot determine status</span>`;
        }
        html += `</div>`;
        
        resultsDiv.innerHTML = html;
        
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error checking link: ${error.message}</div>`;
    }
}

// URL Metadata Extractor
async function extractMetadata() {
    const url = document.getElementById('urlToExtract').value.trim();
    const resultsDiv = document.getElementById('urlMetadataResults');
    
    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }
    
    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include http:// or https://</div>';
        return;
    }
    
    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div class="success">📄 Extracting metadata...</div>';
    
    try {
        const data = await callWorker('metadata', { url });
        
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Page Metadata</strong></div>';
        html += '<div class="dns-results">';
        
        // Title
        if (data.title) {
            html += `<div class="dns-record">`;
            html += `<strong>📌 Title</strong>`;
            html += `<div class="dns-record-value">${escapeHtml(data.title)}</div>`;
            html += `</div>`;
        }
        
        // Description
        if (data.description) {
            html += `<div class="dns-record">`;
            html += `<strong>📝 Description</strong>`;
            html += `<div class="dns-record-value" style="line-height: 1.5;">${escapeHtml(data.description)}</div>`;
            html += `</div>`;
        }
        
        // Open Graph Title
        if (data.ogTitle && data.ogTitle !== data.title) {
            html += `<div class="dns-record">`;
            html += `<strong>🎴 OG Title</strong>`;
            html += `<div class="dns-record-value">${escapeHtml(data.ogTitle)}</div>`;
            html += `</div>`;
        }
        
        // Open Graph Description
        if (data.ogDescription && data.ogDescription !== data.description) {
            html += `<div class="dns-record">`;
            html += `<strong>🎴 OG Description</strong>`;
            html += `<div class="dns-record-value" style="line-height: 1.5;">${escapeHtml(data.ogDescription)}</div>`;
            html += `</div>`;
        }
        
        // Open Graph Image
        if (data.ogImage) {
            const safeImageUrl = escapeHtml(data.ogImage);
            html += `<div class="dns-record">`;
            html += `<strong>🖼️ OG Image</strong>`;
            html += `<div class="dns-record-value">`;
            html += `<img src="${safeImageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 6px; border: 1px solid var(--border-color);" onerror="this.style.display='none'">`;
            html += `<br><a href="${safeImageUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); font-size: 0.9em;">${safeImageUrl}</a>`;
            html += `</div></div>`;
        }
        
        // Keywords
        if (data.keywords) {
            html += `<div class="dns-record">`;
            html += `<strong>🏷️ Keywords</strong>`;
            html += `<div class="dns-record-value">${escapeHtml(data.keywords)}</div>`;
            html += `</div>`;
        }
        
        // Author
        if (data.author) {
            html += `<div class="dns-record">`;
            html += `<strong>✍️ Author</strong>`;
            html += `<div class="dns-record-value">${escapeHtml(data.author)}</div>`;
            html += `</div>`;
        }
        
        html += '</div>';
        
        // Note
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>Social Media Preview:</strong> This is how the link will appear when shared on social media platforms like Facebook, Twitter, LinkedIn, etc.`;
        html += `</p></div>`;
        
        resultsDiv.innerHTML = html;
        
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error extracting metadata: ${error.message}</div>`;
    }
}

// ============================================
// SECURITY HEADERS CHECKER (Uses Worker)
// ============================================
async function checkSecurityHeaders() {
    let url = document.getElementById('secHeadersUrl').value.trim();
    const resultsDiv = document.getElementById('secHeadersResults');

    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }

    // Auto-add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🛡️ Checking security headers...</div>';

    try {
        const data = await callWorker('secheaders', { url });

        // Grade color
        const gradeColors = {
            'A+': 'var(--success-color)', 'A': 'var(--success-color)',
            'B': '#F2C200', 'C': '#F2C200',
            'D': 'var(--error-color)', 'F': 'var(--error-color)'
        };
        const gradeColor = gradeColors[data.grade] || 'var(--text-secondary)';

        let html = '';

        // Grade badge
        html += `<div style="text-align: center; margin: 20px 0;">`;
        html += `<div style="display: inline-block; width: 80px; height: 80px; line-height: 80px; border-radius: 50%; background: ${gradeColor}; color: #111318; font-size: 2em; font-weight: 800; font-family: var(--font-mono);">${escapeHtml(data.grade)}</div>`;
        html += `<div style="margin-top: 8px; color: var(--text-secondary); font-size: 0.9em;">Score: ${data.score}%</div>`;
        html += `</div>`;

        html += '<div class="dns-results">';

        // Individual header checks
        if (data.checks) {
            for (const [headerName, check] of Object.entries(data.checks)) {
                const icon = check.present ? '✅' : '❌';
                const color = check.present ? 'var(--success-color)' : 'var(--error-color)';

                html += `<div class="dns-record">`;
                html += `<strong>${icon} ${escapeHtml(headerName)}</strong>`;
                html += `<div class="dns-record-value">`;
                if (check.present && check.value) {
                    html += `<span style="color: var(--success-color);">Present</span><br>`;
                    html += `<code style="font-size: 0.85em; word-break: break-all; color: var(--text-secondary);">${escapeHtml(check.value.substring(0, 200))}${check.value.length > 200 ? '...' : ''}</code>`;
                } else {
                    html += `<span style="color: var(--error-color);">Missing</span><br>`;
                    if (check.recommendation) {
                        html += `<small style="color: var(--text-secondary);">💡 ${escapeHtml(check.recommendation)}</small>`;
                    }
                }
                html += `</div></div>`;
            }
        }

        html += '</div>';

        // Summary
        const presentCount = data.checks ? Object.values(data.checks).filter(c => c.present).length : 0;
        const totalCount = data.checks ? Object.keys(data.checks).length : 0;
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid ${gradeColor};">`;
        html += `<strong>Summary:</strong> ${presentCount} of ${totalCount} security headers present`;
        html += `</div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error checking security headers: ${error.message}</div>`;
    }
}

// ============================================
// TECH STACK DETECTOR (Uses Worker)
// ============================================
async function detectTechStack() {
    const url = document.getElementById('techDetectUrl').value.trim();
    const resultsDiv = document.getElementById('techDetectResults');

    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }

    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include https://</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🔍 Detecting technologies...</div>';

    try {
        const data = await callWorker('techdetect', { url });

        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Technologies Detected (' + (data.count || 0) + ')</strong></div>';
        html += '<div class="dns-results">';

        if (data.technologies && data.technologies.length > 0) {
            // Group by category
            const groups = {};
            data.technologies.forEach(tech => {
                const cat = tech.category || 'Other';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(tech);
            });

            const categoryIcons = {
                'Server/Hosting': '🖥️',
                'CMS': '📝',
                'JS Framework': '⚛️',
                'JS Library': '📦',
                'CSS Framework': '🎨',
                'CDN/Security': '🛡️',
                'Analytics': '📊',
                'E-commerce': '🛒',
                'Website Builder': '🏗️',
                'Payment': '💳',
                'Security': '🔒',
                'Hosting': '☁️',
                'Other': '🔧'
            };

            for (const [category, techs] of Object.entries(groups)) {
                const icon = categoryIcons[category] || '🔧';
                html += `<div class="dns-record">`;
                html += `<strong>${icon} ${escapeHtml(category)}</strong>`;
                html += `<div class="dns-record-value">`;
                techs.forEach(tech => {
                    html += `<strong>${escapeHtml(tech.name)}</strong>`;
                    if (tech.evidence) {
                        html += ` <small style="color: var(--text-secondary);">(${escapeHtml(tech.evidence)})</small>`;
                    }
                    html += `<br>`;
                });
                html += `</div></div>`;
            }
        } else {
            html += '<div class="dns-record"><strong>No technologies detected</strong>';
            html += '<div class="dns-record-value" style="color: var(--text-secondary);">Could not identify any known technologies on this page.</div></div>';
        }

        html += '</div>';

        // Summary
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>Note:</strong> Detection is based on HTTP headers and HTML content analysis. Some technologies may not be detectable if they don't leave visible signatures.`;
        html += `</p></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error detecting technologies: ${error.message}</div>`;
    }
}

// ============================================
// ROBOTS.TXT & SITEMAP ANALYZER (Uses Worker)
// ============================================
async function analyzeRobots() {
    const url = document.getElementById('robotsUrl').value.trim();
    const resultsDiv = document.getElementById('robotsResults');

    if (!url) {
        resultsDiv.innerHTML = '<div class="error">Please enter a URL!</div>';
        return;
    }

    try {
        new URL(url);
    } catch (e) {
        resultsDiv.innerHTML = '<div class="error">Invalid URL format! Please include https://</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🤖 Analyzing robots.txt & sitemap...</div>';

    try {
        const data = await callWorker('robots', { url });

        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Robots & Sitemap Analysis for ' + escapeHtml(data.baseUrl || url) + '</strong></div>';
        html += '<div class="dns-results">';

        // Robots.txt
        html += `<div class="dns-record">`;
        if (data.robotsTxt) {
            html += `<strong>✅ robots.txt Found</strong>`;
            html += `<div class="dns-record-value">`;
            // Parse and display key directives
            const lines = data.robotsTxt.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
            const allows = lines.filter(l => l.toLowerCase().startsWith('allow:'));
            const disallows = lines.filter(l => l.toLowerCase().startsWith('disallow:'));
            const userAgents = lines.filter(l => l.toLowerCase().startsWith('user-agent:'));
            const sitemaps = lines.filter(l => l.toLowerCase().startsWith('sitemap:'));

            html += `<strong>User-Agents:</strong> ${userAgents.length} rule(s)<br>`;
            html += `<strong>Allow Rules:</strong> ${allows.length}<br>`;
            html += `<strong>Disallow Rules:</strong> ${disallows.length}<br>`;
            html += `<strong>Sitemap References:</strong> ${sitemaps.length}<br>`;

            if (disallows.length > 0) {
                html += `<br><strong>Blocked Paths:</strong><br>`;
                disallows.slice(0, 10).forEach(d => {
                    const path = d.split(':').slice(1).join(':').trim();
                    html += `🚫 ${escapeHtml(path || '(empty)')}<br>`;
                });
                if (disallows.length > 10) {
                    html += `<em>... and ${disallows.length - 10} more</em><br>`;
                }
            }

            html += `<br><details style="cursor: pointer;"><summary style="color: var(--primary-color); font-weight: 600;">View Full robots.txt</summary>`;
            html += `<pre style="margin-top: 10px; padding: 12px; background: var(--card-background); border: 1px solid var(--border-color); border-radius: 6px; overflow-x: auto; font-size: 0.85em; max-height: 300px; overflow-y: auto;">${escapeHtml(data.robotsTxt)}</pre>`;
            html += `</details>`;
            html += `</div></div>`;
        } else {
            html += `<strong>❌ robots.txt Not Found</strong>`;
            html += `<div class="dns-record-value" style="color: var(--warning-color);">No robots.txt file found at ${escapeHtml(data.baseUrl || url)}/robots.txt</div>`;
            html += `</div>`;
        }

        // Sitemap
        html += `<div class="dns-record">`;
        if (data.sitemap) {
            html += `<strong>✅ Sitemap Found</strong>`;
            html += `<div class="dns-record-value">`;
            html += `<strong>URL:</strong> <a href="${escapeHtml(data.sitemap.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color);">${escapeHtml(data.sitemap.url)}</a><br>`;
            html += `<strong>URLs in Sitemap:</strong> ${data.sitemap.urlCount}<br>`;
            
            if (data.sitemap.sampleUrls && data.sitemap.sampleUrls.length > 0) {
                html += `<br><strong>Sample URLs (first ${Math.min(data.sitemap.sampleUrls.length, 10)}):</strong><br>`;
                data.sitemap.sampleUrls.slice(0, 10).forEach(sampleUrl => {
                    html += `• <a href="${escapeHtml(sampleUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); font-size: 0.9em;">${escapeHtml(sampleUrl)}</a><br>`;
                });
                if (data.sitemap.sampleUrls.length > 10) {
                    html += `<em>... and more</em><br>`;
                }
            }
            html += `</div></div>`;
        } else {
            html += `<strong>⚠️ No Sitemap Found</strong>`;
            html += `<div class="dns-record-value" style="color: var(--warning-color);">No sitemap reference found in robots.txt</div>`;
            html += `</div>`;
        }

        html += '</div>';

        // SEO Tips
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>SEO Tips:</strong> A well-configured robots.txt and XML sitemap help search engines crawl and index your site efficiently. Make sure your sitemap includes all important pages and is referenced in robots.txt.`;
        html += `</p></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error analyzing robots: ${error.message}</div>`;
    }
}

// ============================================
