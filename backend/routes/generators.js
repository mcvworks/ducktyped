const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function success(data) { return { error: false, data }; }
function fail(msg) { return { error: true, message: msg }; }

// ============================================
// FAKE DATA GENERATOR
// ============================================
router.post('/fake-data', (req, res) => {
    try {
        const count = Math.min(parseInt(req.body.count) || 5, 50);
        const types = req.body.types || ['name', 'email', 'uuid'];

        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
            'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
            'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
            'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
        const domains = ['example.com', 'test.org', 'mail.net', 'demo.io', 'sample.dev'];
        const streets = ['Main St', 'Oak Ave', 'Park Dr', 'Elm St', 'Maple Rd', 'Cedar Ln', 'Pine St'];
        const cities = ['Springfield', 'Portland', 'Austin', 'Nashville', 'Denver', 'Seattle', 'Boston'];
        const states = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const records = [];
        for (let i = 0; i < count; i++) {
            const first = pick(firstNames);
            const last = pick(lastNames);
            const record = {};

            if (types.includes('name')) record.name = `${first} ${last}`;
            if (types.includes('email')) record.email = `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1,99)}@${pick(domains)}`;
            if (types.includes('uuid')) record.uuid = crypto.randomUUID();
            if (types.includes('phone')) record.phone = `(${randInt(200,999)}) ${randInt(200,999)}-${randInt(1000,9999)}`;
            if (types.includes('address')) record.address = `${randInt(100,9999)} ${pick(streets)}, ${pick(cities)}, ${pick(states)} ${randInt(10000,99999)}`;
            if (types.includes('ip')) record.ip = `${randInt(1,254)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`;
            if (types.includes('mac')) record.mac = Array.from({length: 6}, () => randInt(0,255).toString(16).padStart(2, '0')).join(':');
            if (types.includes('date')) record.date = new Date(randInt(2020, 2025), randInt(0, 11), randInt(1, 28)).toISOString().split('T')[0];
            if (types.includes('company')) record.company = `${pick(lastNames)} ${pick(['Inc', 'LLC', 'Corp', 'Co', 'Group', 'Tech', 'Solutions'])}`;

            records.push(record);
        }

        res.json(success({ count: records.length, records }));
    } catch (err) {
        res.status(500).json(fail('Data generation failed'));
    }
});

module.exports = router;
