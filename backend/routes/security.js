const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const { success, fail, sanitizeHost, validateUrl } = require('../utils');

const execAsync = promisify(exec);
const cache = new NodeCache({ stdTTL: 3600 });

// ============================================
// WHOIS LOOKUP (real whois command)
// ============================================
router.post('/whois', async (req, res) => {
    try {
        const domain = sanitizeHost(req.body.domain);
        if (!domain) return res.status(400).json(fail('Invalid domain'));

        const cacheKey = `whois:${domain}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        const { stdout } = await execAsync(`whois ${domain}`, { timeout: 15000 });

        // Parse key fields
        const parseField = (text, patterns) => {
            for (const p of patterns) {
                const match = text.match(new RegExp(`${p}:\\s*(.+)`, 'i'));
                if (match) return match[1].trim();
            }
            return null;
        };

        const result = {
            raw: stdout,
            registrar: parseField(stdout, ['Registrar', 'Sponsoring Registrar']),
            createdDate: parseField(stdout, ['Creation Date', 'Created', 'Registration Date']),
            expiryDate: parseField(stdout, ['Expiry Date', 'Expiration Date', 'Registry Expiry']),
            updatedDate: parseField(stdout, ['Updated Date', 'Last Updated']),
            nameServers: [...stdout.matchAll(/Name Server:\s*(.+)/gi)].map(m => m[1].trim()),
            status: [...stdout.matchAll(/Status:\s*(.+)/gi)].map(m => m[1].trim()),
            registrant: parseField(stdout, ['Registrant Organization', 'Registrant Name']),
        };

        cache.set(cacheKey, result, 86400);
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('WHOIS lookup failed'));
    }
});

// ============================================
// SSL CERTIFICATE CHECK
// ============================================
router.post('/ssl', async (req, res) => {
    try {
        const domain = sanitizeHost(req.body.domain);
        if (!domain) return res.status(400).json(fail('Invalid domain'));

        const cacheKey = `ssl:${domain}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        // Use openssl to get certificate info
        const { stdout } = await execAsync(
            `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer -serial -fingerprint -text 2>/dev/null`,
            { timeout: 10000 }
        );

        const parseField = (text, field) => {
            const match = text.match(new RegExp(`${field}=(.+?)(?:\\n|$)`, 'i'));
            return match ? match[1].trim() : null;
        };

        const notBefore = parseField(stdout, 'notBefore');
        const notAfter = parseField(stdout, 'notAfter');
        const daysRemaining = notAfter
            ? Math.ceil((new Date(notAfter) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

        const result = {
            domain,
            subject: parseField(stdout, 'subject.*?CN\\s*'),
            issuer: parseField(stdout, 'issuer.*?O\\s*'),
            validFrom: notBefore,
            validTo: notAfter,
            daysRemaining,
            isExpired: daysRemaining !== null && daysRemaining < 0,
            isExpiringSoon: daysRemaining !== null && daysRemaining < 30,
            serial: parseField(stdout, 'serial'),
            fingerprint: parseField(stdout, 'SHA1 Fingerprint'),
            raw: stdout
        };

        cache.set(cacheKey, result, 3600);
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('SSL check failed'));
    }
});

// ============================================
// SECURITY HEADERS CHECKER
// ============================================
router.post('/security-headers', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const cacheKey = `secheaders:${url}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        const resp = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: { 'User-Agent': 'duckTyped-Bot/1.0' }
        });

        const headers = resp.headers;

        // Grade each security header
        const checks = {
            'Strict-Transport-Security': {
                present: !!headers['strict-transport-security'],
                value: headers['strict-transport-security'] || null,
                weight: 20,
                recommendation: 'Add HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains'
            },
            'Content-Security-Policy': {
                present: !!headers['content-security-policy'],
                value: headers['content-security-policy'] || null,
                weight: 25,
                recommendation: 'Add CSP header to prevent XSS and injection attacks'
            },
            'X-Content-Type-Options': {
                present: headers['x-content-type-options'] === 'nosniff',
                value: headers['x-content-type-options'] || null,
                weight: 10,
                recommendation: 'Add: X-Content-Type-Options: nosniff'
            },
            'X-Frame-Options': {
                present: !!headers['x-frame-options'],
                value: headers['x-frame-options'] || null,
                weight: 10,
                recommendation: 'Add: X-Frame-Options: DENY or SAMEORIGIN'
            },
            'X-XSS-Protection': {
                present: !!headers['x-xss-protection'],
                value: headers['x-xss-protection'] || null,
                weight: 5,
                recommendation: 'Add: X-XSS-Protection: 1; mode=block'
            },
            'Referrer-Policy': {
                present: !!headers['referrer-policy'],
                value: headers['referrer-policy'] || null,
                weight: 10,
                recommendation: 'Add: Referrer-Policy: strict-origin-when-cross-origin'
            },
            'Permissions-Policy': {
                present: !!headers['permissions-policy'],
                value: headers['permissions-policy'] || null,
                weight: 10,
                recommendation: 'Add Permissions-Policy to control browser features'
            },
            'X-Permitted-Cross-Domain-Policies': {
                present: !!headers['x-permitted-cross-domain-policies'],
                value: headers['x-permitted-cross-domain-policies'] || null,
                weight: 5,
                recommendation: 'Add: X-Permitted-Cross-Domain-Policies: none'
            },
            'Cross-Origin-Opener-Policy': {
                present: !!headers['cross-origin-opener-policy'],
                value: headers['cross-origin-opener-policy'] || null,
                weight: 5,
                recommendation: 'Add: Cross-Origin-Opener-Policy: same-origin'
            }
        };

        let score = 0;
        let maxScore = 0;
        for (const [name, check] of Object.entries(checks)) {
            maxScore += check.weight;
            if (check.present) score += check.weight;
        }

        const percentage = Math.round((score / maxScore) * 100);
        const grade = percentage >= 90 ? 'A+' :
                      percentage >= 80 ? 'A' :
                      percentage >= 70 ? 'B' :
                      percentage >= 60 ? 'C' :
                      percentage >= 40 ? 'D' : 'F';

        const result = { url, grade, score: percentage, checks, allHeaders: headers };
        cache.set(cacheKey, result, 3600);
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('Security headers check failed'));
    }
});

// ============================================
// HASH GENERATOR
// ============================================
router.post('/hash', (req, res) => {
    try {
        const text = req.body.text;
        if (!text) return res.status(400).json(fail('Text required'));

        res.json(success({
            md5: crypto.createHash('md5').update(text).digest('hex'),
            sha1: crypto.createHash('sha1').update(text).digest('hex'),
            sha256: crypto.createHash('sha256').update(text).digest('hex'),
            sha512: crypto.createHash('sha512').update(text).digest('hex'),
        }));
    } catch (err) {
        res.status(500).json(fail('Hash generation failed'));
    }
});

// ============================================
// PASSWORD BREACH CHECK (Have I Been Pwned - k-anonymity)
// ============================================
router.post('/breach-check', async (req, res) => {
    try {
        const password = req.body.password;
        if (!password) return res.status(400).json(fail('Password required'));

        const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
        const prefix = sha1.substring(0, 5);
        const suffix = sha1.substring(5);

        const resp = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, { timeout: 5000 });
        const lines = resp.data.split('\n');
        const match = lines.find(line => line.startsWith(suffix));
        const count = match ? parseInt(match.split(':')[1]) : 0;

        res.json(success({
            breached: count > 0,
            count,
            message: count > 0
                ? `This password has appeared in ${count.toLocaleString()} data breaches.`
                : 'This password has not been found in any known data breaches.'
        }));
    } catch (err) {
        res.status(500).json(fail('Breach check failed'));
    }
});

module.exports = router;
