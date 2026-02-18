const express = require('express');
const router = express.Router();
const { success, fail } = require('../utils');

// ============================================
// JWT DECODER
// ============================================
router.post('/jwt-decode', (req, res) => {
    try {
        const token = (req.body.token || '').trim();
        if (!token) return res.status(400).json(fail('JWT token required'));

        const parts = token.split('.');
        if (parts.length !== 3) return res.status(400).json(fail('Invalid JWT format (expected 3 parts)'));

        const decode = (str) => JSON.parse(Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

        const header = decode(parts[0]);
        const payload = decode(parts[1]);

        // Check expiration
        let isExpired = null;
        let expiresAt = null;
        if (payload.exp) {
            expiresAt = new Date(payload.exp * 1000).toISOString();
            isExpired = Date.now() > payload.exp * 1000;
        }

        let issuedAt = null;
        if (payload.iat) {
            issuedAt = new Date(payload.iat * 1000).toISOString();
        }

        res.json(success({ header, payload, isExpired, expiresAt, issuedAt, signature: parts[2] }));
    } catch (err) {
        res.status(400).json(fail('Failed to decode JWT — invalid token'));
    }
});

// Note: Base64, URL encoding, hash generation, regex testing, JSON/YAML formatting,
// Unix timestamp conversion, and color conversion are all best done CLIENT-SIDE
// for instant responsiveness. These are included in the frontend tools section (Part 3).
// The server only handles JWT because it's a common enough task and validates structure.

module.exports = router;
