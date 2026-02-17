// ============================================
// QUACKTOOLS — Password & Encrypted Notes
// ============================================

// PASSWORD GENERATOR (Client-side, no worker needed)
// ============================================

// Password length control functions
function updatePasswordLength(value) {
    // Ensure value is within bounds
    value = Math.max(8, Math.min(64, parseInt(value) || 16));
    
    // Update display
    document.getElementById('lengthValue').textContent = value;
    
    // Update input field
    const inputField = document.getElementById('passwordLengthInput');
    if (inputField) {
        inputField.value = value;
    }
    
    return value;
}

function setPasswordLength(length) {
    updatePasswordLength(length);
}

function updateLengthFromInput(value) {
    // Parse the value
    let numValue = parseInt(value);
    
    // If empty or invalid, don't update
    if (value === '' || isNaN(numValue)) {
        return;
    }
    
    // Clamp to valid range
    numValue = Math.max(8, Math.min(64, numValue));
    
    // Only update the display label, not the input field itself
    document.getElementById('lengthValue').textContent = numValue;
}

function generatePassword() {
    const inputField = document.getElementById('passwordLengthInput');
    const length = parseInt(inputField.value) || 16;
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeSymbols = document.getElementById('includeSymbols').checked;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
        showToast('Please select at least one character type!', 'error');
        return;
    }

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
    }

    document.getElementById('passwordText').textContent = password;
    document.getElementById('passwordOutput').classList.add('show');
}

function copyPassword() {
    const password = document.getElementById('passwordText').textContent;
    navigator.clipboard.writeText(password).then(() => {
        showToast('✓ Password copied!');
    });
}

function copyLink() {
    const link = document.getElementById('encryptedLink').textContent;
    navigator.clipboard.writeText(link).then(() => {
        showToast('✓ Link copied!');
    }).catch(err => {
        showToast('Failed to copy link', 'error');
    });
}

function togglePasswordField() {
    const requirePassword = document.getElementById('requirePassword').checked;
    const passwordFieldGroup = document.getElementById('passwordFieldGroup');
    
    if (requirePassword) {
        passwordFieldGroup.style.display = 'block';
    } else {
        passwordFieldGroup.style.display = 'none';
    }
}

// ============================================
// ENCRYPTED NOTE SENDER
// ============================================

function initializeEncryptedNotes() {
    const urlParams = new URLSearchParams(window.location.search);
    const messageId = urlParams.get('id');
    
    if (messageId) {
        document.getElementById('encryptView').style.display = 'none';
        document.getElementById('decryptView').style.display = 'block';
    }
}

async function encryptNote() {
    const message = document.getElementById('noteMessage').value;
    const requirePassword = document.getElementById('requirePassword').checked;
    const password = requirePassword ? document.getElementById('encryptPassword').value : 'no-password';

    if (!message) {
        showToast('Please enter a message!', 'error');
        return;
    }

    if (requirePassword && !password) {
        showToast('Please enter a password or uncheck "Require Password"!', 'error');
        return;
    }

    const createBtn = document.getElementById('createLinkBtn');
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';

    try {
        const encoder = new TextEncoder();
        
        // Get selected expiration time in hours
        const expirationHours = parseInt(document.getElementById('expirationTime').value);
        
        // Add expiration timestamp
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + expirationHours);
        const expirationTimestamp = expirationDate.getTime();
        
        // Combine message with expiration: "TIMESTAMP|||MESSAGE"
        const messageWithExpiration = `${expirationTimestamp}|||${message}`;
        const data = encoder.encode(messageWithExpiration);
        
        // Derive key from password
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        // Convert to base64 URL-safe
        const encryptedBase64 = btoa(String.fromCharCode(...combined))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        // Generate unique message ID (optional for future backend tracking)
        const messageId = generateId();
        
        // Create link to separate note viewer page
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const pwdParam = requirePassword ? '1' : '0';
        const shareLink = `${baseUrl}note.html?pwd=${pwdParam}#${encryptedBase64}`;
        
        document.getElementById('encryptedLink').textContent = shareLink;
        document.getElementById('encryptOutput').classList.add('show');
        
        // Get expiration info for display
        const expirationLabels = {
            '1': '1 hour',
            '24': '24 hours',
            '72': '3 days',
            '168': '7 days',
            '720': '30 days'
        };
        const expirationLabel = expirationLabels[expirationHours.toString()] || `${expirationHours} hours`;
        
        // Show appropriate info box
        if (requirePassword) {
            document.getElementById('passwordInfo').innerHTML = `
                <strong>🔒 Password Protected</strong><br>
                <span style="font-size: 0.88em;">Share the password separately (via phone, in person, etc.) for maximum security.</span><br>
                <small>⏱️ Expires in ${expirationLabel}.</small>
            `;
            document.getElementById('passwordInfo').classList.remove('hidden');
        } else {
            document.getElementById('passwordInfo').classList.add('hidden');
        }
        document.getElementById('noPasswordInfo').classList.add('hidden');

    } catch (error) {
        showToast('Encryption failed: ' + error.message, 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Encrypted Link';
    }
}

async function decryptNote() {
    const password = document.getElementById('decryptPassword').value;
    
    if (!password) {
        showToast('Please enter the password!', 'error');
        return;
    }

    const decryptBtn = document.getElementById('decryptBtn');
    decryptBtn.disabled = true;
    decryptBtn.textContent = 'Decrypting...';

    try {
        // Get encrypted data from URL hash
        const encryptedBase64 = window.location.hash.substring(1);
        
        if (!encryptedBase64) {
            throw new Error('No encrypted message found in URL');
        }

        // Convert from base64 URL-safe
        const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
        const combined = new Uint8Array(
            atob(base64).split('').map(c => c.charCodeAt(0))
        );

        // Extract salt, iv, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);

        // Derive key from password
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);

        // Handle expiration format: "TIMESTAMP|||MESSAGE"
        let displayMessage = decryptedText;
        if (decryptedText.includes('|||')) {
            const parts = decryptedText.split('|||');
            const expirationTimestamp = parseInt(parts[0]);
            displayMessage = parts.slice(1).join('|||');
            
            // Check if expired
            if (Date.now() > expirationTimestamp) {
                const expiredDate = new Date(expirationTimestamp);
                showToast('This message has expired on ' + expiredDate.toLocaleString(), 'error', 5000);
                document.getElementById('decryptBtn').disabled = false;
                document.getElementById('decryptBtn').textContent = 'Decrypt Message';
                return;
            }
        }

        document.getElementById('decryptedText').textContent = displayMessage;
        document.getElementById('decryptOutput').classList.add('show');

    } catch (error) {
        showToast('Decryption failed. Wrong password or corrupted message.', 'error');
    } finally {
        decryptBtn.disabled = false;
        decryptBtn.textContent = 'Decrypt Message';
    }
}

function copyEncryptedLink() {
    const link = document.getElementById('encryptedLink').textContent;
    navigator.clipboard.writeText(link).then(() => {
        showToast('✓ Link copied!');
    });
}

function copyDecryptedMessage() {
    const message = document.getElementById('decryptedText').textContent;
    navigator.clipboard.writeText(message).then(() => {
        showToast('✓ Message copied!');
    });
}

function generateId() {
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

// ============================================
