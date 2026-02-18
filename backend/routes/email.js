const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const net = require('net');
const NodeCache = require('node-cache');

const { success, fail } = require('../utils');

const cache = new NodeCache({ stdTTL: 3600 });

// ============================================
// EMAIL VALIDATION (DNS + SMTP check)
// ============================================
router.post('/validate', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) return res.status(400).json(fail('Invalid email'));

        const [localPart, domain] = email.split('@');
        const results = { email, checks: {} };

        // Syntax check
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        results.checks.syntax = { pass: emailRegex.test(email) };

        // MX record check
        try {
            const mx = await dns.resolveMx(domain);
            results.checks.mx = { pass: mx.length > 0, records: mx.sort((a, b) => a.priority - b.priority) };
        } catch (e) {
            results.checks.mx = { pass: false, error: 'No MX records found' };
        }

        // Check for disposable email domain
        const disposableDomains = ['tempmail.com', 'throwaway.email', 'guerrillamail.com',
            'mailinator.com', 'yopmail.com', 'tempinbox.com', 'fakeinbox.com', 'sharklasers.com'];
        results.checks.disposable = { pass: !disposableDomains.includes(domain) };

        res.json(success(results));
    } catch (err) {
        res.status(500).json(fail('Email validation failed'));
    }
});

// ============================================
// SMTP CHECK (verify SMTP connection to MX server)
// ============================================
router.post('/smtp-check', async (req, res) => {
    try {
        const domain = (req.body.domain || '').trim().toLowerCase();
        if (!domain) return res.status(400).json(fail('Domain required'));

        const mx = await dns.resolveMx(domain);
        if (!mx.length) return res.json(success({ domain, smtpReachable: false, error: 'No MX records' }));

        const mxHost = mx.sort((a, b) => a.priority - b.priority)[0].exchange;

        // Try connecting to SMTP
        const smtpResult = await new Promise((resolve) => {
            const socket = net.createConnection(25, mxHost);
            socket.setTimeout(8000);

            let response = '';
            socket.on('data', (data) => {
                response += data.toString();
                if (response.includes('220')) {
                    socket.end('QUIT\r\n');
                    resolve({ reachable: true, banner: response.trim(), mxHost });
                }
            });
            socket.on('timeout', () => { socket.destroy(); resolve({ reachable: false, error: 'Timeout' }); });
            socket.on('error', (err) => resolve({ reachable: false, error: err.message }));
        });

        res.json(success({ domain, ...smtpResult }));
    } catch (err) {
        res.status(500).json(fail('SMTP check failed'));
    }
});

// ============================================
// BLACKLIST / RBL CHECKER
// ============================================
router.post('/blacklist', async (req, res) => {
    try {
        const ip = (req.body.ip || '').trim();
        if (!ip) return res.status(400).json(fail('IP required'));

        const cacheKey = `rbl:${ip}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        // Reverse the IP for DNSBL queries
        const reversed = ip.split('.').reverse().join('.');

        const rbls = [
            { name: 'Spamhaus ZEN', zone: 'zen.spamhaus.org' },
            { name: 'Barracuda', zone: 'b.barracudacentral.org' },
            { name: 'SpamCop', zone: 'bl.spamcop.net' },
            { name: 'SORBS', zone: 'dnsbl.sorbs.net' },
            { name: 'UCEPROTECT-1', zone: 'dnsbl-1.uceprotect.net' },
            { name: 'Composite BL', zone: 'cbl.abuseat.org' },
            { name: 'Invaluement', zone: 'dnsbl.invaluement.com' },
            { name: 'JustSpam', zone: 'dnsbl.justspam.org' },
        ];

        const results = await Promise.allSettled(
            rbls.map(async (rbl) => {
                try {
                    await dns.resolve4(`${reversed}.${rbl.zone}`);
                    return { name: rbl.name, zone: rbl.zone, listed: true };
                } catch (e) {
                    return { name: rbl.name, zone: rbl.zone, listed: false };
                }
            })
        );

        const blacklistResults = results.map(r => r.value || r.reason);
        const listedCount = blacklistResults.filter(r => r.listed).length;

        const result = { ip, results: blacklistResults, listedCount, totalChecked: rbls.length };
        cache.set(cacheKey, result, 3600);
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('Blacklist check failed'));
    }
});

module.exports = router;
