// ============================================
// QUACKTOOLS — Network & Lookup Tools
// DNS, WHOIS, SSL, Port, Ping, ISP, MAC, Notes, SMTP
// ============================================

// DNS RECORD CHECKER (Uses Worker)
// ============================================
async function checkDNS(dkimSelector = '', additionalSelectors = '') {
    const domain = document.getElementById('domainName').value.trim();
    const resultsDiv = document.getElementById('dnsResults');

    if (!domain) {
        resultsDiv.innerHTML = '<div class="error">Please enter a domain name!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Checking DNS records...</div>';

    try {
        const types = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'SOA', 'TXT'];
        let html = '<div class="dns-results">';
        let hasAnyResults = false;
        let errors = [];
        let spfRecord = null;
        let dmarcRecord = null;

        for (const type of types) {
            try {
                const data = await callWorker('dns', { domain, recordType: type });
                
                if (CONFIG.DEBUG) console.log(`DNS ${type} result:`, data);
                
                if (data && data.Answer && data.Answer.length > 0) {
                    hasAnyResults = true;
                    html += `<div class="dns-record">`;
                    html += `<strong>${type} Records:</strong>`;
                    html += `<div class="dns-record-value">`;
                    
                    data.Answer.forEach(record => {
                        html += `${escapeHtml(record.data)}<br>`;
                        
                        // Check for SPF in TXT records
                        if (type === 'TXT' && record.data.includes('v=spf1')) {
                            spfRecord = record.data;
                        }
                    });
                    
                    html += `</div></div>`;
                }
            } catch (error) {
                console.error(`Error checking ${type} record:`, error);
                errors.push(`${type}: ${error.message}`);
            }
        }
        
        // Check DMARC
        try {
            const dmarcData = await callWorker('dns', { domain: `_dmarc.${domain}`, recordType: 'TXT' });
            if (dmarcData && dmarcData.Answer && dmarcData.Answer.length > 0) {
                hasAnyResults = true;
                dmarcRecord = dmarcData.Answer[0].data;
                html += `<div class="dns-record">`;
                html += `<strong>DMARC Record:</strong>`;
                html += `<div class="dns-record-value">`;
                html += `${escapeHtml(dmarcRecord)}<br>`;
                html += `</div></div>`;
            }
        } catch (error) {
            if (CONFIG.DEBUG) console.log('No DMARC record found');
        }
        
        // SPF Summary
        if (spfRecord) {
            html += `<div class="dns-record">`;
            html += `<strong>SPF Summary:</strong>`;
            html += `<div class="dns-record-value" style="color: var(--success-color);">`;
            html += `✓ SPF record found<br>`;
            html += `</div></div>`;
        }
        
        // DKIM Check Section
        html += `<div class="dns-record">`;
        html += `<strong>DKIM Records:</strong>`;
        html += `<div class="dns-record-value">`;
        html += `Check DKIM with common selectors:<br><br>`;
        const safeDomain = domain.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 'default')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">default</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 'google')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">google</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 'k1')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">k1</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 's1')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">s1</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 's2')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">s2</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 'selector1')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">selector1</button>`;
        html += `<button onclick="checkDKIMSelector('${safeDomain}', 'selector2')" style="margin: 4px; padding: 8px 12px; font-size: 0.85em;">selector2</button>`;
        html += `</div>`;
        html += `<div id="dkimResults" style="margin-top: 10px;"></div>`;
        html += `</div>`;

        if (!hasAnyResults) {
            if (errors.length > 0) {
                html += '<div class="error">Errors occurred:<br>' + errors.join('<br>') + '</div>';
            } else {
                html += '<div class="error">No DNS records found for this domain.</div>';
            }
        }

        html += '</div>';
        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Check specific DKIM selector
async function checkDKIMSelector(domain, selector) {
    const dkimResults = document.getElementById('dkimResults');
    if (!dkimResults) return;
    
    dkimResults.innerHTML = `<div class="success">Checking DKIM selector: ${selector}...</div>`;
    
    try {
        const dkimDomain = `${selector}._domainkey.${domain}`;
        const data = await callWorker('dns', { domain: dkimDomain, recordType: 'TXT' });
        
        if (data && data.Answer && data.Answer.length > 0) {
            let html = `<div style="margin-top: 10px; padding: 10px; background: var(--success-bg); border-left: 3px solid var(--success-color); border-radius: 4px;">`;
            html += `<strong style="color: var(--success-color);">✓ DKIM Found (${selector}):</strong><br>`;
            html += `<div style="margin-top: 8px; font-size: 0.9em; word-break: break-all; color: var(--text-primary); font-family: var(--font-mono); line-height: 1.6;">`;
            data.Answer.forEach(record => {
                html += `<span style="color: var(--text-secondary);">${escapeHtml(record.data)}</span><br>`;
            });
            html += `</div></div>`;
            dkimResults.innerHTML = html;
        } else {
            dkimResults.innerHTML = `<div style="margin-top: 10px; color: var(--text-secondary);">No DKIM record found for selector: ${selector}</div>`;
        }
    } catch (error) {
        dkimResults.innerHTML = `<div style="margin-top: 10px; color: var(--text-secondary);">No DKIM record found for selector: ${selector}</div>`;
    }
}

// ============================================
// WHOIS / IP LOOKUP (Uses Worker)
// ============================================
async function lookupWhois() {
    let input = document.getElementById('whoisInput').value.trim();
    const resultsDiv = document.getElementById('whoisResults');

    // If blank, get user's IP automatically
    if (!input) {
        resultsDiv.innerHTML = '<div class="success">Detecting your IP address...</div>';
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            input = ipData.ip;
            if (CONFIG.DEBUG) console.log('Auto-detected IP:', input);
        } catch (error) {
            resultsDiv.innerHTML = '<div class="error">Could not detect your IP. Please enter a domain or IP manually.</div>';
            return;
        }
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Looking up information...</div>';

    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(input);

    try {
        if (isIP) {
            // IP Lookup
            const data = await callWorker('isp', { ip: input });
            
            let html = '<div class="dns-record">';
            html += `<strong>IP Information for ${input}</strong>`;
            html += `<div class="dns-record-value">`;
            html += `<strong>ISP:</strong> ${escapeHtml(data.isp || 'Unknown')}<br>`;
            html += `<strong>Organization:</strong> ${escapeHtml(data.org || 'Unknown')}<br>`;
            html += `<strong>Country:</strong> ${escapeHtml(data.country || 'Unknown')}<br>`;
            html += `<strong>Region:</strong> ${escapeHtml(data.regionName || 'Unknown')}<br>`;
            html += `<strong>City:</strong> ${escapeHtml(data.city || 'Unknown')}<br>`;
            html += `<strong>Timezone:</strong> ${escapeHtml(data.timezone || 'Unknown')}<br>`;
            html += `</div></div>`;
            
            resultsDiv.innerHTML = html;
        } else {
            // Domain WHOIS
            const data = await callWorker('whois', { domain: input });
            
            let html = '<div class="dns-record">';
            html += `<strong>WHOIS Information for ${input}</strong>`;
            html += `<div class="dns-record-value">`;
            
            // Show registrar
            if (data.registrar) {
                html += `<strong>Registrar:</strong> ${escapeHtml(data.registrar)}<br>`;
            }
            
            // Show dates
            if (data.events) {
                if (data.events.registered) {
                    const regDate = new Date(data.events.registered).toLocaleDateString();
                    html += `<strong>Registered:</strong> ${regDate}<br>`;
                }
                if (data.events.expires) {
                    const expDate = new Date(data.events.expires).toLocaleDateString();
                    html += `<strong>Expires:</strong> ${expDate}<br>`;
                }
                if (data.events.updated) {
                    const updDate = new Date(data.events.updated).toLocaleDateString();
                    html += `<strong>Last Updated:</strong> ${updDate}<br>`;
                }
            }
            
            // Show nameservers
            if (data.nameservers && data.nameservers.length > 0) {
                html += `<br><strong>Name Servers:</strong><br>`;
                data.nameservers.forEach(ns => {
                    html += `• ${escapeHtml(ns)}<br>`;
                });
            }
            
            // Show status
            if (data.status && data.status.length > 0) {
                html += `<br><strong>Status:</strong><br>`;
                data.status.forEach(status => {
                    html += `• ${escapeHtml(status)}<br>`;
                });
            }
            
            // Add link to detailed WHOIS
            html += `<br><small style="color: var(--text-secondary);">`;
            html += `For more details: <a href="https://who.is/whois/${input}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color);">View full WHOIS</a>`;
            html += `</small>`;
            
            html += `</div></div>`;
            resultsDiv.innerHTML = html;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// SSL CERTIFICATE CHECKER (Uses Worker)
// ============================================
async function checkSSL() {
    const domain = document.getElementById('sslDomain').value.trim();
    const resultsDiv = document.getElementById('sslResults');
    if (!domain) {
        resultsDiv.innerHTML = '<div class="error">Please enter a domain name!</div>';
        return;
    }
    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }
    resultsDiv.innerHTML = '<div class="success">Checking SSL certificate...</div>';
    try {
        const data = await callWorker('ssl', { domain });
        
        const isValid = !data.isExpired && data.validTo;
        const statusIcon = isValid ? '✅' : '❌';
        const expiryWarning = data.isExpiringSoon ? ' ⚠️ Expiring soon!' : '';
        
        let html = '<div class="dns-record">';
        html += `<strong>SSL Certificate for ${data.domain || domain}</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>Status:</strong> ${statusIcon} ${isValid ? 'Valid' : 'Invalid / Expired'}${expiryWarning}<br>`;
        html += `<strong>Subject:</strong> ${data.subject || 'N/A'}<br>`;
        html += `<strong>Issuer:</strong> ${data.issuer || 'N/A'}<br>`;
        html += `<strong>Valid From:</strong> ${data.validFrom || 'N/A'}<br>`;
        html += `<strong>Valid To:</strong> ${data.validTo || 'N/A'}<br>`;
        html += `<strong>Days Remaining:</strong> ${data.daysRemaining !== null ? data.daysRemaining + ' days' : 'N/A'}<br>`;
        html += `<strong>Serial:</strong> <span style="word-break: break-all;">${data.serial || 'N/A'}</span><br>`;
        html += `<strong>Fingerprint:</strong> <span style="word-break: break-all;">${data.fingerprint || 'N/A'}</span><br>`;
        html += `</div></div>`;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}
// ============================================
// PORT SCANNER (Uses Worker)
// ============================================

// Helper function to set port number
function setPort(port, serviceName) {
    const portInput = document.getElementById('portNumber');
    if (portInput) {
        portInput.value = port;
    }
}

async function scanPort(specificPort = null) {
    const host = document.getElementById('portScanHost').value.trim();
    const resultsDiv = document.getElementById('portResults');
    
    // Use specific port if provided, otherwise get from input field
    const port = specificPort !== null ? specificPort : parseInt(document.getElementById('portNumber').value);

    if (!host) {
        resultsDiv.innerHTML = '<div class="error">Please enter a host!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Scanning port...</div>';

    try {
        const data = await callWorker('port', { host, port: parseInt(port) });
        
        let html = '<div class="dns-record">';
        html += `<strong>Port Scan Results</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>Host:</strong> ${host}<br>`;
        html += `<strong>Port:</strong> ${data.port}<br>`;
        
        if (data.open === null) {
            html += `<strong>Status:</strong> ⚠️ Cannot scan<br>`;
            html += `<strong>Note:</strong> ${data.note || 'Port scanning limited in cloud environment'}<br>`;
        } else if (data.open) {
            html += `<strong>Status:</strong> ✅ Open/Responding<br>`;
        } else {
            html += `<strong>Status:</strong> ❌ Closed/Filtered<br>`;
        }
        
        if (data.note) {
            html += `<em style="color: var(--text-secondary); font-size: 0.9em;">${data.note}</em><br>`;
        }
        
        html += `</div></div>`;
        
        // Add external tools section if port couldn't be scanned
        if (data.open === null || (port !== 80 && port !== 443 && port !== 8080)) {
            html += `<div style="margin-top: 20px; padding: 15px; background: var(--input-background); border-radius: 8px; border: 1px solid var(--border-color);">`;
            html += `<strong style="color: var(--primary-color);">🔍 Need to scan other ports?</strong><br>`;
            html += `<p style="color: var(--text-secondary); margin: 10px 0; font-size: 0.9em; line-height: 1.5;">`;
            html += `Due to browser security limitations, we can only test HTTP/HTTPS ports directly. `;
            html += `For comprehensive port scanning, try these professional tools:`;
            html += `</p>`;
            html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">`;
            html += `<a href="https://www.yougetsignal.com/tools/open-ports/" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
            html += `→ <strong>YouGetSignal</strong> - Fast single port scanner</a>`;
            html += `<a href="https://mxtoolbox.com/PortScan.aspx" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
            html += `→ <strong>MXToolbox</strong> - Scan multiple ports at once</a>`;
            html += `<a href="https://hackertarget.com/nmap-online-port-scanner/" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
            html += `→ <strong>HackerTarget</strong> - Full Nmap scan (top 100 ports)</a>`;
            html += `<a href="https://pentest-tools.com/network-vulnerability-scanning/tcp-port-scanner-online-nmap" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
            html += `→ <strong>Pentest-Tools</strong> - Advanced port scanning & analysis</a>`;
            html += `</div>`;
            html += `</div>`;
        }
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Add custom port number
function addCustomPort() {
    const input = document.getElementById('customPortNumber');
    const portNumber = parseInt(input.value);
    const customPortsList = document.getElementById('customPortsList');
    
    // Validate port number
    if (!portNumber || portNumber < 1 || portNumber > 65535) {
        showToast('Please enter a valid port number (1-65535)', 'error');
        return;
    }
    
    // Check if port already exists in checkboxes
    const existingCheckbox = document.querySelector(`.port-checkbox[value="${portNumber}"]`);
    if (existingCheckbox) {
        showToast(`Port ${portNumber} is already in the list above!`, 'error');
        input.value = '';
        return;
    }
    
    // Check if custom port already added
    const existingCustom = document.querySelector(`.custom-port-tag[data-port="${portNumber}"]`);
    if (existingCustom) {
        showToast(`Port ${portNumber} is already added!`, 'error');
        input.value = '';
        return;
    }
    
    // Create custom port tag
    const portTag = document.createElement('span');
    portTag.className = 'custom-port-tag';
    portTag.setAttribute('data-port', portNumber);
    portTag.setAttribute('data-name', `Port ${portNumber}`);
    portTag.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: linear-gradient(135deg, var(--primary-gradient-start), var(--primary-gradient-end));
        color: #000000;
        border-radius: 6px;
        font-size: 0.85em;
        font-weight: 600;
    `;
    portTag.innerHTML = `
        ${portNumber}
        <span onclick="removeCustomPort(${portNumber})" style="cursor: pointer; font-weight: bold; margin-left: 2px;">×</span>
    `;
    
    customPortsList.appendChild(portTag);
    input.value = '';
}

function removeCustomPort(portNumber) {
    const portTag = document.querySelector(`.custom-port-tag[data-port="${portNumber}"]`);
    if (portTag) {
        portTag.remove();
    }
}

// Scan all common ports at once
async function scanSelectedPorts() {
    const host = document.getElementById('portScanHost').value.trim();
    const resultsDiv = document.getElementById('portResults');
    
    if (!host) {
        resultsDiv.innerHTML = '<div class="error">Please enter a host!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    // Get selected ports from checkboxes
    const checkboxes = document.querySelectorAll('.port-checkbox:checked');
    
    // Get custom ports
    const customPortTags = document.querySelectorAll('.custom-port-tag');
    const customPorts = Array.from(customPortTags).map(tag => ({
        port: parseInt(tag.getAttribute('data-port')),
        name: tag.getAttribute('data-name')
    }));
    
    // Combine checkbox ports and custom ports
    const checkboxPorts = Array.from(checkboxes).map(cb => ({
        port: parseInt(cb.value),
        name: cb.getAttribute('data-name')
    }));
    
    const selectedPorts = [...checkboxPorts, ...customPorts];
    
    if (selectedPorts.length === 0) {
        resultsDiv.innerHTML = '<div class="error">Please select at least one port to scan or add a custom port!</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🔍 Scanning ' + selectedPorts.length + ' port' + (selectedPorts.length > 1 ? 's' : '') + '... This may take a moment.</div>';

    try {
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Port Scan Results for ' + host + '</strong></div>';
        html += '<div class="dns-results">';

        let scannedCount = 0;
        let openCount = 0;

        for (const portInfo of selectedPorts) {
            try {
                const data = await callWorker('port', { host, port: portInfo.port });
                scannedCount++;

                let statusIcon = '';
                let statusText = '';
                let statusColor = '';

                if (data.open === null) {
                    statusIcon = '⚠️';
                    statusText = 'Cannot scan';
                    statusColor = 'var(--warning-color)';
                } else if (data.open) {
                    statusIcon = '✅';
                    statusText = 'OPEN';
                    statusColor = 'var(--success-color)';
                    openCount++;
                } else {
                    statusIcon = '❌';
                    statusText = 'Closed';
                    statusColor = 'var(--text-secondary)';
                }

                html += `<div class="dns-record">`;
                html += `<strong>${statusIcon} Port ${portInfo.port} - ${portInfo.name}</strong>`;
                html += `<div class="dns-record-value" style="color: ${statusColor};">${statusText}</div>`;
                html += `</div>`;

                // Update progress
                const progress = `<div class="success">🔍 Scanning... ${scannedCount}/${selectedPorts.length} ports checked (${openCount} open)</div>`;
                resultsDiv.innerHTML = progress + html + '</div>';

                // Small delay to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Error scanning port ${portInfo.port}:`, error);
                html += `<div class="dns-record">`;
                html += `<strong>⚠️ Port ${portInfo.port} - ${portInfo.name}</strong>`;
                html += `<div class="dns-record-value" style="color: var(--error-color);">Error scanning</div>`;
                html += `</div>`;
            }
        }

        html += '</div>';

        // Summary
        html += `<div style="margin-top: 20px; padding: 15px; background: var(--input-background); border-radius: 8px; border: 1px solid var(--border-color);">`;
        html += `<strong style="color: var(--primary-color);">📊 Scan Summary</strong><br>`;
        html += `<div style="margin-top: 10px; color: var(--text-secondary);">`;
        html += `<strong>${scannedCount}</strong> ports scanned<br>`;
        html += `<strong style="color: var(--success-color);">${openCount}</strong> ports open<br>`;
        html += `<strong>${scannedCount - openCount}</strong> ports closed/filtered`;
        html += `</div></div>`;

        // Note about limitations
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 8px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>Note:</strong> Due to browser security limitations, only HTTP/HTTPS ports (80, 443, 8080, 8443) can be directly tested. `;
        html += `Other ports show estimated status based on connection attempts. For accurate scanning of all ports, use dedicated tools like Nmap.`;
        html += `</p></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error during port scan: ${error.message}</div>`;
    }
}

// ============================================
// PING / LATENCY CHECKER (Uses Worker)
// ============================================
async function checkPing() {
    const host = document.getElementById('pingHost').value.trim();
    const resultsDiv = document.getElementById('pingResults');

    if (!host) {
        resultsDiv.innerHTML = '<div class="error">Please enter a host!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Checking latency...</div>';

    try {
        const data = await callWorker('ping', { host });
        
        if (CONFIG.DEBUG) console.log('Ping data received:', data);
        
        let html = '<div class="dns-record">';
        html += `<strong>Latency Check Results</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>Host:</strong> ${data.host}<br>`;
        html += `<strong>Status:</strong> ${data.status}<br>`;
        if (data.latency) {
            html += `<strong>Response Time:</strong> ${data.latency}ms<br>`;
        }
        if (data.note) {
            html += `<br><em style="color: var(--text-secondary); font-size: 0.9em;">${data.note}</em>`;
        }
        if (data.error) {
            html += `<br><strong>Error:</strong> ${data.error}`;
        }
        
        html += `</div></div>`;
        
        // Add external ICMP ping tools section
        html += `<div style="margin-top: 20px; padding: 15px; background: var(--input-background); border-radius: 8px; border: 1px solid var(--border-color);">`;
        html += `<strong style="color: var(--primary-color);">🌐 Need true ICMP ping?</strong><br>`;
        html += `<p style="color: var(--text-secondary); margin: 10px 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `This tool measures HTTP response time. For real ICMP ping tests, try these tools:`;
        html += `</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">`;
        html += `<a href="https://ping.eu/ping/" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
        html += `→ <strong>Ping.eu</strong> - Free ICMP ping test from multiple locations</a>`;
        html += `<a href="https://www.site24x7.com/tools/ping-test.html" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
        html += `→ <strong>Site24x7</strong> - Ping test with detailed statistics</a>`;
        html += `<a href="https://centralops.net/co/Ping.aspx" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
        html += `→ <strong>CentralOps</strong> - Ping and traceroute tools</a>`;
        html += `<a href="https://tools.keycdn.com/ping" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; font-size: 0.9em;">`;
        html += `→ <strong>KeyCDN</strong> - Ping from 14 global locations</a>`;
        html += `</div>`;
        html += `</div>`;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// ISP CHECKER (Uses Worker)
// ============================================
async function checkISP() {
    let ip = document.getElementById('ispInput').value.trim();
    const resultsDiv = document.getElementById('ispResults');

    // If blank, get user's IP automatically
    if (!ip) {
        resultsDiv.innerHTML = '<div class="success">Detecting your IP address...</div>';
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            ip = ipData.ip;
            if (CONFIG.DEBUG) console.log('Auto-detected IP:', ip);
        } catch (error) {
            resultsDiv.innerHTML = '<div class="error">Could not detect your IP. Please enter one manually.</div>';
            return;
        }
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Checking ISP...</div>';

    try {
        const data = await callWorker('isp', { ip });
        
        if (CONFIG.DEBUG) console.log('ISP data received:', data);
        
        let html = '<div class="dns-record">';
        html += `<strong>ISP Information</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>IP:</strong> ${ip}<br>`;
        html += `<strong>ISP:</strong> ${data.isp || 'Unknown'}<br>`;
        html += `<strong>Organization:</strong> ${data.org || 'Unknown'}<br>`;
        html += `<strong>Country:</strong> ${data.country || 'Unknown'}<br>`;
        html += `<strong>State:</strong> ${data.regionName || 'Unknown'}<br>`;
        html += `<strong>City:</strong> ${data.city || 'Unknown'}<br>`;
        
        html += `</div></div>`;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// MAC ADDRESS LOOKUP (Uses Worker)
// ============================================
async function lookupMAC() {
    const mac = document.getElementById('macInput').value.trim();
    const resultsDiv = document.getElementById('macResults');

    if (!mac) {
        resultsDiv.innerHTML = '<div class="error">Please enter a MAC address!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">Looking up vendor...</div>';

    try {
        const data = await callWorker('mac', { mac });
        
        let html = '<div class="dns-record">';
        html += `<strong>MAC Address Lookup</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>MAC:</strong> ${mac}<br>`;
        html += `<strong>Vendor:</strong> ${data.vendor || 'Unknown'}<br>`;
        html += `</div></div>`;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Generate random MAC address
function generateRandomMAC() {
    const hexDigits = '0123456789ABCDEF';
    let mac = '';
    
    // Generate 6 octets (12 hex digits, formatted as XX:XX:XX:XX:XX:XX)
    for (let i = 0; i < 6; i++) {
        if (i > 0) mac += ':';
        mac += hexDigits[Math.floor(Math.random() * 16)];
        mac += hexDigits[Math.floor(Math.random() * 16)];
    }
    
    // Set the first octet's second-least significant bit to 0 (unicast)
    // and the least significant bit to 1 (locally administered)
    const firstOctet = parseInt(mac.substr(0, 2), 16);
    const modifiedFirstOctet = (firstOctet & 0xFE) | 0x02;
    mac = modifiedFirstOctet.toString(16).toUpperCase().padStart(2, '0') + mac.substr(2);
    
    // Put it in the input field
    document.getElementById('macInput').value = mac;
    
    // Optionally auto-lookup
    lookupMAC();
}

// ============================================
// PLAIN NOTES (Client-side, localStorage)
// ============================================
function loadSavedNotes() {
    const savedNotes = localStorage.getItem('plainNotes');
    if (savedNotes && document.getElementById('notesTextarea')) {
        document.getElementById('notesTextarea').value = savedNotes;
    }
}

function saveNotes() {
    const textarea = document.getElementById('notesTextarea');
    if (!textarea) return;
    const notes = textarea.value;
    localStorage.setItem('plainNotes', notes);
    
    const statusDiv = document.getElementById('notesSaveStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
    }
    showToast('✓ Notes saved!');
}

function clearNotes() {
    if (confirm('Are you sure you want to clear all notes?')) {
        document.getElementById('notesTextarea').value = '';
        localStorage.removeItem('plainNotes');
        showToast('Notes cleared');
    }
}

function downloadNotes() {
    const textarea = document.getElementById('notesTextarea');
    if (!textarea || !textarea.value.trim()) {
        showToast('No notes to download!', 'error');
        return;
    }
    const blob = new Blob([textarea.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quacktools-notes-' + new Date().toISOString().slice(0, 10) + '.txt';
    link.click();
    URL.revokeObjectURL(url);
    showToast('✓ Notes downloaded!');
}

// Auto-save notes every 30 seconds
let autoSaveTimeout;
if (document.getElementById('notesTextarea')) {
    document.getElementById('notesTextarea').addEventListener('input', function() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            localStorage.setItem('plainNotes', this.value);
        }, 2000);
    });
}

// ============================================
// TRACEROUTE (Uses Worker)
// ============================================
async function runTraceroute() {
    const host = document.getElementById('tracerouteHost').value.trim();
    const resultsDiv = document.getElementById('tracerouteResults');

    if (!host) {
        resultsDiv.innerHTML = '<div class="error">Please enter a host!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🛤️ Running traceroute... This may take up to 30 seconds.</div>';

    try {
        const data = await callWorker('traceroute', { host });

        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Traceroute to ' + escapeHtml(data.host || host) + '</strong></div>';
        html += '<div class="dns-results">';

        if (data.hops && data.hops.length > 0) {
            data.hops.forEach(hop => {
                let statusIcon = hop.timeout ? '⏳' : '✅';
                let hopColor = hop.timeout ? 'var(--warning-color)' : 'var(--text-secondary)';

                html += `<div class="dns-record">`;
                html += `<strong>${statusIcon} Hop ${hop.hop}</strong>`;
                html += `<div class="dns-record-value" style="color: ${hopColor};">`;

                if (hop.timeout) {
                    html += `* * * (no response)`;
                } else {
                    if (hop.hostname && hop.hostname !== hop.ip) {
                        html += `<strong>Host:</strong> ${escapeHtml(hop.hostname)}<br>`;
                    }
                    if (hop.ip) {
                        html += `<strong>IP:</strong> ${hop.ip}<br>`;
                    }
                    if (hop.times && hop.times.length > 0) {
                        const avg = (hop.times.reduce((a, b) => a + b, 0) / hop.times.length).toFixed(1);
                        html += `<strong>RTT:</strong> ${hop.times.map(t => t + 'ms').join(' / ')} (avg: ${avg}ms)`;
                    }
                }

                html += `</div></div>`;
            });
        } else {
            html += '<div class="error">No hops returned. Host may be unreachable.</div>';
        }

        html += '</div>';

        // Summary
        if (data.hops && data.hops.length > 0) {
            const totalHops = data.hops.length;
            const timeoutHops = data.hops.filter(h => h.timeout).length;
            html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border: 1px solid var(--border-color);">`;
            html += `<strong>Summary:</strong> ${totalHops} hops total, ${timeoutHops} timed out`;
            html += `</div>`;
        }

        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// REVERSE DNS LOOKUP (Uses Worker)
// ============================================
async function lookupReverseDns() {
    const ip = document.getElementById('reverseDnsInput').value.trim();
    const resultsDiv = document.getElementById('reverseDnsResults');

    if (!ip) {
        resultsDiv.innerHTML = '<div class="error">Please enter an IP address!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🔄 Looking up reverse DNS...</div>';

    try {
        const data = await callWorker('reversedns', { ip });

        let html = '<div class="dns-results">';

        html += `<div class="dns-record">`;
        html += `<strong>🔍 Reverse DNS for ${escapeHtml(data.ip || ip)}</strong>`;
        html += `<div class="dns-record-value">`;

        if (data.hostnames && data.hostnames.length > 0) {
            html += `<strong>Hostname(s):</strong><br>`;
            data.hostnames.forEach(hostname => {
                html += `✅ ${escapeHtml(hostname)}<br>`;
            });
        } else {
            html += `<span style="color: var(--warning-color);">⚠️ No reverse DNS (PTR) record found for this IP.</span>`;
            if (data.error) {
                html += `<br><small style="color: var(--text-secondary);">${escapeHtml(data.error)}</small>`;
            }
        }

        html += `</div></div>`;
        html += '</div>';

        // Info note
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>What is Reverse DNS?</strong> A PTR record maps an IP address back to a hostname. It's commonly used to verify mail server identity and for security auditing.`;
        html += `</p></div>`;

        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// SUBNET CALCULATOR (Uses Worker)
// ============================================
async function calculateSubnet() {
    const ip = document.getElementById('subnetIp').value.trim();
    const cidr = document.getElementById('subnetCidr').value.trim();
    const resultsDiv = document.getElementById('subnetResults');

    if (!ip) {
        resultsDiv.innerHTML = '<div class="error">Please enter an IP address!</div>';
        return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        resultsDiv.innerHTML = '<div class="error">Invalid IP format! Use format: 192.168.1.0</div>';
        return;
    }

    const cidrNum = parseInt(cidr);
    if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
        resultsDiv.innerHTML = '<div class="error">CIDR must be between 0 and 32!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = '<div class="error">Backend service unavailable. Please try again later.</div>';
        return;
    }

    resultsDiv.innerHTML = '<div class="success">🔢 Calculating subnet...</div>';

    try {
        const data = await callWorker('subnet', { ip, cidr: cidrNum });

        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">Subnet Details for ' + escapeHtml(ip) + '/' + cidrNum + '</strong></div>';
        html += '<div class="dns-results">';

        html += `<div class="dns-record">`;
        html += `<strong>🌐 Network Information</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>Network Address:</strong> ${escapeHtml(data.network)}<br>`;
        html += `<strong>Broadcast Address:</strong> ${escapeHtml(data.broadcast)}<br>`;
        html += `<strong>Subnet Mask:</strong> ${escapeHtml(data.netmask)}<br>`;
        html += `<strong>Wildcard Mask:</strong> ${escapeHtml(data.wildcardMask)}<br>`;
        html += `</div></div>`;

        html += `<div class="dns-record">`;
        html += `<strong>📊 Host Range</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>First Usable Host:</strong> ${escapeHtml(data.firstHost)}<br>`;
        html += `<strong>Last Usable Host:</strong> ${escapeHtml(data.lastHost)}<br>`;
        html += `<strong>Total Usable Hosts:</strong> ${data.totalHosts.toLocaleString()}<br>`;
        html += `</div></div>`;

        html += `<div class="dns-record">`;
        html += `<strong>ℹ️ Additional Info</strong>`;
        html += `<div class="dns-record-value">`;
        html += `<strong>CIDR Notation:</strong> /${data.cidr}<br>`;
        html += `<strong>IP Class:</strong> ${escapeHtml(data.ipClass)}<br>`;
        html += `<strong>Private Address:</strong> ${data.isPrivate ? '✅ Yes (RFC 1918)' : '❌ No (Public)'}<br>`;
        html += `</div></div>`;

        html += '</div>';

        resultsDiv.innerHTML = html;
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// ============================================
// SMTP CHECKER
// ============================================

async function checkSMTP() {
    const host = document.getElementById('smtpHost').value.trim();
    const resultsDiv = document.getElementById('smtpResults');
    
    if (!host) {
        resultsDiv.innerHTML = '<div class="error">Please enter a mail server or domain!</div>';
        return;
    }

    if (!workerAvailable) {
        resultsDiv.innerHTML = `
            <div class="error">
                <strong>⚠️ Backend Service Required</strong><br><br>
                The SMTP checker requires a backend service to test mail server connections. 
                Browsers cannot directly connect to SMTP ports due to security restrictions.<br><br>
                <strong>Alternative Tools:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><a href="https://mxtoolbox.com/SuperTool.aspx" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color);">MXToolbox</a> - Free SMTP diagnostics</li>
                    <li><a href="https://www.whatsmyip.org/port-scanner/" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color);">Port Scanner</a> - Check if ports are open</li>
                    <li>Use command line: <code style="background: var(--input-background); padding: 2px 6px; border-radius: 3px;">telnet mail.example.com 25</code></li>
                </ul>
            </div>`;
        return;
    }

    // Get selected SMTP ports
    const checkboxes = document.querySelectorAll('.smtp-port-checkbox:checked');
    
    if (checkboxes.length === 0) {
        resultsDiv.innerHTML = '<div class="error">Please select at least one SMTP port to check!</div>';
        return;
    }

    const selectedPorts = Array.from(checkboxes).map(cb => ({
        port: parseInt(cb.value),
        name: cb.getAttribute('data-name')
    }));

    resultsDiv.innerHTML = '<div class="success">🔍 Checking SMTP server on ' + selectedPorts.length + ' port(s)...</div>';

    try {
        let html = '<div style="margin-bottom: 15px;"><strong style="font-size: 1.1em;">SMTP Check Results for ' + host + '</strong></div>';
        html += '<div class="dns-results">';

        let totalChecked = 0;
        let totalOpen = 0;

        for (const portInfo of selectedPorts) {
            try {
                const data = await callWorker('port', { host, port: portInfo.port });
                totalChecked++;

                let statusIcon = '';
                let statusText = '';
                let statusColor = '';

                if (data.open === null) {
                    statusIcon = '⚠️';
                    statusText = 'Cannot test - Use external tool';
                    statusColor = 'var(--warning-color)';
                } else if (data.open) {
                    statusIcon = '✅';
                    statusText = 'OPEN - Server is accessible';
                    statusColor = 'var(--success-color)';
                    totalOpen++;
                } else {
                    statusIcon = '❌';
                    statusText = 'CLOSED - Not accessible';
                    statusColor = 'var(--text-secondary)';
                }

                html += `<div class="dns-record">`;
                html += `<strong>${statusIcon} Port ${portInfo.port} - ${portInfo.name}</strong>`;
                html += `<div class="dns-record-value" style="color: ${statusColor};">${statusText}</div>`;
                html += `</div>`;

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`Error checking port ${portInfo.port}:`, error);
                html += `<div class="dns-record">`;
                html += `<strong>⚠️ Port ${portInfo.port} - ${portInfo.name}</strong>`;
                html += `<div class="dns-record-value" style="color: var(--error-color);">Error checking</div>`;
                html += `</div>`;
                totalChecked++;
            }
        }

        html += '</div>';

        // Summary
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border: 1px solid var(--border-color);">`;
        html += `<strong>Summary:</strong> `;
        html += `<span style="color: var(--success-color);">${totalOpen}</span> of ${totalChecked} SMTP ports are accessible`;
        html += `</div>`;

        // Info note
        html += `<div style="margin-top: 15px; padding: 12px; background: var(--input-background); border-radius: 6px; border-left: 3px solid var(--primary-color);">`;
        html += `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9em; line-height: 1.5;">`;
        html += `<strong>Note:</strong> This checks if ports are open, not if the server accepts mail. For full SMTP testing including authentication and mail acceptance, use dedicated tools like Telnet or external SMTP testers.`;
        html += `</p></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error checking SMTP server: ${error.message}</div>`;
    }
}

// ============================================
