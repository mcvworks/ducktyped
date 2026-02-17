// ============================================
// QUACKTOOLS — QR Code Tools
// Generator, Scanner, WiFi QR, vCard QR
// ============================================

// QR CODE TOOLS
// ============================================

// Update QR input fields based on type selection
function updateQRInputs() {
    const type = document.getElementById('qrType').value;
    const container = document.getElementById('qrInputContainer');
    
    let html = '';
    switch(type) {
        case 'url':
            html = `
                <div class="input-group">
                    <label>URL:</label>
                    <input type="url" id="qrURL" placeholder="https://example.com">
                </div>
            `;
            break;
        case 'text':
            html = `
                <div class="input-group">
                    <label>Text:</label>
                    <textarea id="qrText" placeholder="Enter any text..." style="min-height: 100px;"></textarea>
                </div>
            `;
            break;
        case 'email':
            html = `
                <div class="input-group">
                    <label>Email Address:</label>
                    <input type="email" id="qrEmail" placeholder="user@example.com">
                </div>
                <div class="input-group">
                    <label>Subject (optional):</label>
                    <input type="text" id="qrEmailSubject" placeholder="Email subject">
                </div>
                <div class="input-group">
                    <label>Message (optional):</label>
                    <textarea id="qrEmailBody" placeholder="Email message..." style="min-height: 80px;"></textarea>
                </div>
            `;
            break;
        case 'phone':
            html = `
                <div class="input-group">
                    <label>Phone Number:</label>
                    <input type="tel" id="qrPhone" placeholder="+1-555-123-4567">
                </div>
            `;
            break;
        case 'sms':
            html = `
                <div class="input-group">
                    <label>Phone Number:</label>
                    <input type="tel" id="qrSMSPhone" placeholder="+1-555-123-4567">
                </div>
                <div class="input-group">
                    <label>Message:</label>
                    <textarea id="qrSMSMessage" placeholder="SMS message..." style="min-height: 80px;"></textarea>
                </div>
            `;
            break;
    }
    container.innerHTML = html;
}

// ============================================
// QR CODE MODE SWITCHING
// ============================================

let currentQRMode = 'text';

function switchQRMode(mode) {
    currentQRMode = mode;
    
    // Update button styles via classes (not inline styles)
    const buttons = document.querySelectorAll('.qr-mode-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        // Clear any previously set inline styles
        btn.style.background = '';
        btn.style.color = '';
        btn.style.border = '';
    });
    
    const activeBtn = document.getElementById('qrMode' + mode.charAt(0).toUpperCase() + mode.slice(1));
    activeBtn.classList.add('active');
    
    // Show/hide content sections
    document.getElementById('qrModeTextContent').style.display = mode === 'text' ? 'block' : 'none';
    document.getElementById('qrModeWifiContent').style.display = mode === 'wifi' ? 'block' : 'none';
    document.getElementById('qrModeVcardContent').style.display = mode === 'vcard' ? 'block' : 'none';
    
    // Clear output
    document.getElementById('qrOutput').innerHTML = '';
}

function generateUnifiedQR() {
    if (currentQRMode === 'text') {
        generateQRCode();
    } else if (currentQRMode === 'wifi') {
        generateWiFiQR();
    } else if (currentQRMode === 'vcard') {
        generateVCardQR();
    }
}

// Generate QR Code
function generateQRCode() {
    const type = document.getElementById('qrType').value;
    const size = parseInt(document.getElementById('qrSize').value);
    const outputDiv = document.getElementById('qrOutput');
    
    let data = '';
    
    // Get data based on type
    switch(type) {
        case 'url':
            data = document.getElementById('qrURL')?.value || '';
            break;
        case 'text':
            data = document.getElementById('qrText')?.value || '';
            break;
        case 'email':
            const email = document.getElementById('qrEmail')?.value || '';
            const subject = document.getElementById('qrEmailSubject')?.value || '';
            const body = document.getElementById('qrEmailBody')?.value || '';
            data = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            break;
        case 'phone':
            data = `tel:${document.getElementById('qrPhone')?.value || ''}`;
            break;
        case 'sms':
            const phone = document.getElementById('qrSMSPhone')?.value || '';
            const message = document.getElementById('qrSMSMessage')?.value || '';
            data = `sms:${phone}?body=${encodeURIComponent(message)}`;
            break;
    }
    
    if (!data || data.length < 3) {
        outputDiv.innerHTML = '<div class="error">Please enter valid data!</div>';
        return;
    }
    
    // Clear previous QR code
    outputDiv.innerHTML = '<div id="qrCodeCanvas"></div>';
    
    // Generate QR code
    try {
        new QRCode(document.getElementById('qrCodeCanvas'), {
            text: data,
            width: size,
            height: size,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Add download button after a brief delay
        setTimeout(() => {
            const canvas = document.querySelector('#qrCodeCanvas canvas');
            if (canvas) {
                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = '⬇️ Download QR Code';
                downloadBtn.style.marginTop = '15px';
                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.download = 'qrcode.png';
                    link.href = canvas.toDataURL();
                    link.click();
                };
                outputDiv.appendChild(downloadBtn);
            }
        }, 100);
        
    } catch (error) {
        outputDiv.innerHTML = '<div class="error">Error generating QR code: ' + error.message + '</div>';
    }
}

// Scan QR from uploaded file
function scanQRFromFile() {
    const fileInput = document.getElementById('qrImageUpload');
    const resultsDiv = document.getElementById('qrScanResults');
    
    if (!fileInput.files || !fileInput.files[0]) {
        return;
    }
    
    resultsDiv.innerHTML = '<div class="success">📷 Scanning QR code...</div>';
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                const safeData = escapeHtml(code.data);
                resultsDiv.innerHTML = `
                    <div class="success">✅ QR Code Decoded Successfully!</div>
                    <div class="output" style="margin-top: 15px;">
                        <strong>Content:</strong>
                        <div class="output-content" style="margin-top: 10px; word-break: break-all;">
                            ${safeData}
                        </div>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('qrDecodedData').value).then(() => showToast('✓ Copied to clipboard!'))" style="margin-top: 10px;">
                            📋 Copy to Clipboard
                        </button>
                        <input type="hidden" id="qrDecodedData" value="">
                    </div>
                `;
                // Set value safely via DOM to prevent XSS
                document.getElementById('qrDecodedData').value = code.data;
            } else {
                resultsDiv.innerHTML = '<div class="error">❌ No QR code found in image. Make sure the QR code is clear and fully visible.</div>';
            }
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Scan QR from camera
let qrStream = null;
function scanQRFromCamera() {
    const container = document.getElementById('qrCameraContainer');
    const video = document.getElementById('qrVideo');
    const resultsDiv = document.getElementById('qrScanResults');
    
    container.style.display = 'block';
    resultsDiv.innerHTML = '<div class="success">📷 Starting camera...</div>';
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            qrStream = stream;
            video.srcObject = stream;
            video.play();
            
            resultsDiv.innerHTML = '<div class="success">📷 Camera active. Point at QR code...</div>';
            
            // Scan for QR codes
            const scanInterval = setInterval(() => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (code) {
                        clearInterval(scanInterval);
                        stopQRCamera();
                        const safeData = escapeHtml(code.data);
                        resultsDiv.innerHTML = `
                            <div class="success">✅ QR Code Scanned Successfully!</div>
                            <div class="output" style="margin-top: 15px;">
                                <strong>Content:</strong>
                                <div class="output-content" style="margin-top: 10px; word-break: break-all;">
                                    ${safeData}
                                </div>
                                <button onclick="navigator.clipboard.writeText(document.getElementById('qrCameraDecodedData').value).then(() => showToast('✓ Copied to clipboard!'))" style="margin-top: 10px;">
                                    📋 Copy to Clipboard
                                </button>
                                <input type="hidden" id="qrCameraDecodedData" value="">
                            </div>
                        `;
                        document.getElementById('qrCameraDecodedData').value = code.data;
                    }
                }
            }, 500);
        })
        .catch(error => {
            resultsDiv.innerHTML = '<div class="error">❌ Camera access denied or not available: ' + error.message + '</div>';
            container.style.display = 'none';
        });
}

function stopQRCamera() {
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    document.getElementById('qrCameraContainer').style.display = 'none';
}

// Generate WiFi QR Code
function generateWiFiQR() {
    const ssid = document.getElementById('wifiSSID').value.trim();
    const password = document.getElementById('wifiPassword').value;
    const security = document.getElementById('wifiSecurity').value;
    const hidden = document.getElementById('wifiHidden').checked;
    const outputDiv = document.getElementById('qrOutput');
    
    if (!ssid) {
        outputDiv.innerHTML = '<div class="error">Please enter WiFi network name (SSID)!</div>';
        return;
    }
    
    // WiFi QR format: WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;;
    let wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};`;
    
    outputDiv.innerHTML = '<div id="wifiQRCanvas"></div>';
    
    try {
        new QRCode(document.getElementById('wifiQRCanvas'), {
            text: wifiString,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        setTimeout(() => {
            const canvas = document.querySelector('#wifiQRCanvas canvas');
            if (canvas) {
                let html = `
                    <div class="output" style="margin-top: 15px;">
                        <strong>WiFi Details:</strong>
                        <div class="output-content" style="margin-top: 10px;">
                            Network: <strong>${ssid}</strong><br>
                            Security: <strong>${security || 'Open'}</strong><br>
                            Hidden: <strong>${hidden ? 'Yes' : 'No'}</strong>
                        </div>
                    </div>
                    <button onclick="downloadQRCanvas('wifiQRCanvas', 'wifi-qr.png')" style="margin-top: 15px;">
                        ⬇️ Download QR Code
                    </button>
                `;
                outputDiv.innerHTML += html;
            }
        }, 100);
        
    } catch (error) {
        outputDiv.innerHTML = '<div class="error">Error generating WiFi QR code: ' + error.message + '</div>';
    }
}

// Generate vCard QR Code
function generateVCardQR() {
    const name = document.getElementById('vcardName').value.trim();
    const org = document.getElementById('vcardOrg').value.trim();
    const title = document.getElementById('vcardTitle').value.trim();
    const phone = document.getElementById('vcardPhone').value.trim();
    const email = document.getElementById('vcardEmail').value.trim();
    const website = document.getElementById('vcardWebsite').value.trim();
    const address = document.getElementById('vcardAddress').value.trim();
    const outputDiv = document.getElementById('qrOutput');
    
    if (!name) {
        outputDiv.innerHTML = '<div class="error">Please enter a name!</div>';
        return;
    }
    
    // Build vCard format
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
    vcard += `FN:${name}\n`;
    if (org) vcard += `ORG:${org}\n`;
    if (title) vcard += `TITLE:${title}\n`;
    if (phone) vcard += `TEL:${phone}\n`;
    if (email) vcard += `EMAIL:${email}\n`;
    if (website) vcard += `URL:${website}\n`;
    if (address) vcard += `ADR:;;${address};;;;\n`;
    vcard += 'END:VCARD';
    
    outputDiv.innerHTML = '<div id="vcardQRCanvas"></div>';
    
    try {
        new QRCode(document.getElementById('vcardQRCanvas'), {
            text: vcard,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        setTimeout(() => {
            const canvas = document.querySelector('#vcardQRCanvas canvas');
            if (canvas) {
                let html = `
                    <div class="output" style="margin-top: 15px;">
                        <strong>Contact Details:</strong>
                        <div class="output-content" style="margin-top: 10px;">
                            Name: <strong>${name}</strong><br>
                            ${org ? `Organization: <strong>${org}</strong><br>` : ''}
                            ${title ? `Title: <strong>${title}</strong><br>` : ''}
                            ${phone ? `Phone: <strong>${phone}</strong><br>` : ''}
                            ${email ? `Email: <strong>${email}</strong><br>` : ''}
                        </div>
                    </div>
                    <button onclick="downloadQRCanvas('vcardQRCanvas', 'contact-qr.png')" style="margin-top: 15px;">
                        ⬇️ Download QR Code
                    </button>
                `;
                outputDiv.innerHTML += html;
            }
        }, 100);
        
    } catch (error) {
        outputDiv.innerHTML = '<div class="error">Error generating vCard QR code: ' + error.message + '</div>';
    }
}

// Helper function to download QR canvas
function downloadQRCanvas(canvasId, filename) {
    const canvas = document.querySelector(`#${canvasId} canvas`);
    if (canvas) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    }
}

// ============================================
