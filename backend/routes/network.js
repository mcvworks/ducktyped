const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const dns = require('dns');
const { Resolver } = require('dns').promises;
const NodeCache = require('node-cache');
const axios = require('axios');

const execAsync = promisify(exec);
const cache = new NodeCache({ stdTTL: 300 }); // 5 min default

// Helper: sanitize domain/IP input
function sanitizeHost(input) {
    if (!input) return null;
    const cleaned = input.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/[^a-z0-9.\-:]/g, '');
    if (cleaned.length > 253) return null;
    return cleaned;
}

// Helper: wrap response
function success(data) { return { error: false, data }; }
function fail(msg) { return { error: true, message: msg }; }

// ============================================
// DNS LOOKUP
// ============================================
router.post('/dns', async (req, res) => {
    try {
        const domain = sanitizeHost(req.body.domain);
        if (!domain) return res.status(400).json(fail('Invalid domain'));

        const cacheKey = `dns:${domain}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        const resolver = new Resolver();
        resolver.setServers(['8.8.8.8', '1.1.1.1']);

        const results = {};
        const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME', 'CAA'];

        await Promise.allSettled(
            recordTypes.map(async (type) => {
                try {
                    results[type] = await resolver.resolve(domain, type);
                } catch (e) {
                    results[type] = [];
                }
            })
        );

        // SPF, DKIM, DMARC from TXT records
        const txtRecords = results.TXT?.flat() || [];
        results.SPF = txtRecords.filter(r => r.startsWith('v=spf1'));
        results.DMARC = [];
        try {
            const dmarc = await resolver.resolve(`_dmarc.${domain}`, 'TXT');
            results.DMARC = dmarc.flat().filter(r => r.startsWith('v=DMARC1'));
        } catch (e) {}

        // DKIM (common selectors)
        results.DKIM = {};
        const dkimSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'k2', 'mail', 'dkim'];
        if (req.body.dkimSelector) dkimSelectors.unshift(req.body.dkimSelector);

        await Promise.allSettled(
            dkimSelectors.map(async (sel) => {
                try {
                    const dkim = await resolver.resolve(`${sel}._domainkey.${domain}`, 'TXT');
                    if (dkim.length) results.DKIM[sel] = dkim.flat();
                } catch (e) {}
            })
        );

        cache.set(cacheKey, results, 3600);
        res.json(success(results));
    } catch (err) {
        console.error('DNS error:', err);
        res.status(500).json(fail('DNS lookup failed'));
    }
});

// ============================================
// PORT SCAN (using nmap)
// ============================================
router.post('/port-scan', async (req, res) => {
    try {
        const host = sanitizeHost(req.body.host);
        const ports = req.body.ports || '21,22,25,53,80,110,143,443,993,995,3306,3389,5432,8080,8443';
        if (!host) return res.status(400).json(fail('Invalid host'));

        // Validate ports string (only numbers, commas, dashes)
        if (!/^[0-9,\-]+$/.test(ports)) return res.status(400).json(fail('Invalid port format'));

        const cacheKey = `port:${host}:${ports}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        // Run nmap with timeout — -T4 for faster scan, --max-retries 1
        const { stdout } = await execAsync(
            `nmap -p ${ports} -T4 --max-retries 1 --host-timeout 15s -oX - ${host}`,
            { timeout: 20000 }
        );

        // Parse nmap XML output
        const portResults = [];
        const portRegex = /<port protocol="(\w+)" portid="(\d+)">.*?<state state="(\w+)".*?\/>.*?<service name="(.*?)".*?\/>/gs;
        let match;
        while ((match = portRegex.exec(stdout))) {
            portResults.push({
                port: parseInt(match[2]),
                protocol: match[1],
                state: match[3],
                service: match[4]
            });
        }

        const result = { host, ports: portResults, scanTime: new Date().toISOString() };
        cache.set(cacheKey, result, 300);
        res.json(success(result));
    } catch (err) {
        console.error('Port scan error:', err);
        res.status(500).json(fail('Port scan failed or timed out'));
    }
});

// ============================================
// HTTP LATENCY
// ============================================
router.post('/http-latency', async (req, res) => {
    try {
        let url = (req.body.host || '').trim();
        if (!url) return res.status(400).json(fail('Invalid host'));

        // Ensure URL has a scheme
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        const start = Date.now();
        const response = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: { 'User-Agent': 'duckTyped-latency-checker/1.0' }
        });
        const latency = Date.now() - start;

        res.json(success({
            host: req.body.host,
            url,
            statusCode: response.status,
            statusText: response.statusText,
            latency,
            contentType: response.headers['content-type'] || null,
            redirected: response.request?.res?.responseUrl !== url
        }));
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            return res.status(200).json(success({ host: req.body.host, error: 'Host unreachable or DNS failed' }));
        }
        if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
            return res.status(200).json(success({ host: req.body.host, error: 'Request timed out (>10s)' }));
        }
        res.status(500).json(fail('HTTP latency check failed'));
    }
});

// ============================================
// PING / LATENCY
// ============================================
router.post('/ping', async (req, res) => {
    try {
        const host = sanitizeHost(req.body.host);
        if (!host) return res.status(400).json(fail('Invalid host'));

        const { stdout } = await execAsync(
            `ping -c 4 -W 3 ${host}`,
            { timeout: 15000 }
        );

        // Parse ping output
        const lines = stdout.split('\n');
        const statsLine = lines.find(l => l.includes('min/avg/max'));
        const lossLine = lines.find(l => l.includes('packet loss'));

        let stats = {};
        if (statsLine) {
            const match = statsLine.match(/([\d.]+)\/([\d.]+)\/([\d.]+)/);
            if (match) {
                stats = { min: parseFloat(match[1]), avg: parseFloat(match[2]), max: parseFloat(match[3]) };
            }
        }
        if (lossLine) {
            const lossMatch = lossLine.match(/([\d.]+)% packet loss/);
            stats.packetLoss = lossMatch ? parseFloat(lossMatch[1]) : 0;
        }

        res.json(success({ host, ...stats, raw: stdout }));
    } catch (err) {
        res.status(500).json(fail('Ping failed or host unreachable'));
    }
});

// ============================================
// TRACEROUTE
// ============================================
router.post('/traceroute', async (req, res) => {
    try {
        const host = sanitizeHost(req.body.host);
        if (!host) return res.status(400).json(fail('Invalid host'));

        const { stdout } = await execAsync(
            `traceroute -I -m 20 -w 2 ${host}`,
            { timeout: 30000 }
        );

        const hops = [];
        const lines = stdout.split('\n').slice(1); // Skip header
        for (const line of lines) {
            const match = line.match(/^\s*(\d+)\s+(.+)/);
            if (match) {
                const hopNum = parseInt(match[1]);
                const hopData = match[2];
                const ipMatch = hopData.match(/\(([\d.]+)\)/);
                const timeMatches = [...hopData.matchAll(/([\d.]+)\s+ms/g)];
                hops.push({
                    hop: hopNum,
                    ip: ipMatch ? ipMatch[1] : null,
                    hostname: hopData.split(/\s/)[0] === '*' ? null : hopData.split(/\s/)[0],
                    times: timeMatches.map(m => parseFloat(m[1])),
                    timeout: hopData.includes('* * *')
                });
            }
        }

        res.json(success({ host, hops, raw: stdout }));
    } catch (err) {
        res.status(500).json(fail('Traceroute failed'));
    }
});

// ============================================
// ISP LOOKUP
// ============================================
router.post('/isp', async (req, res) => {
    try {
        let ip = req.body.ip;
        if (!ip || ip === 'auto') {
            ip = req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.ip;
        }

        const cacheKey = `isp:${ip}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        // Use ipinfo.io (50K free/month) or ip-api.com as fallback
        let data;
        if (process.env.IPINFO_TOKEN) {
            const resp = await axios.get(`https://ipinfo.io/${ip}?token=${process.env.IPINFO_TOKEN}`);
            data = resp.data;
        } else {
            const resp = await axios.get(`http://ip-api.com/json/${ip}`);
            data = resp.data;
        }

        cache.set(cacheKey, data, 86400);
        res.json(success(data));
    } catch (err) {
        res.status(500).json(fail('ISP lookup failed'));
    }
});

// ============================================
// MAC ADDRESS LOOKUP
// ============================================
router.post('/mac', async (req, res) => {
    try {
        const mac = (req.body.mac || '').trim().toUpperCase();
        if (!mac || mac.length < 6) return res.status(400).json(fail('Invalid MAC address'));

        const cacheKey = `mac:${mac}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        const resp = await axios.get(`https://api.macvendors.com/${mac}`, {
            timeout: 5000,
            validateStatus: () => true
        });

        const result = { mac, vendor: resp.status === 200 ? resp.data : 'Unknown vendor' };
        cache.set(cacheKey, result, 2592000); // 30 days
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('MAC lookup failed'));
    }
});

// ============================================
// REVERSE DNS
// ============================================
router.post('/reverse-dns', async (req, res) => {
    try {
        const ip = (req.body.ip || '').trim();
        if (!ip) return res.status(400).json(fail('Invalid IP'));

        const hostnames = await dns.promises.reverse(ip);
        res.json(success({ ip, hostnames }));
    } catch (err) {
        res.json(success({ ip: req.body.ip, hostnames: [], error: 'No reverse DNS record found' }));
    }
});

// ============================================
// SUBNET CALCULATOR (computed server-side but could also be client-side)
// ============================================
router.post('/subnet', (req, res) => {
    try {
        const { ip, cidr } = req.body;
        if (!ip || cidr === undefined) return res.status(400).json(fail('IP and CIDR required'));

        const cidrNum = parseInt(cidr);
        if (cidrNum < 0 || cidrNum > 32) return res.status(400).json(fail('CIDR must be 0-32'));

        const ipParts = ip.split('.').map(Number);
        const ipLong = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
        const mask = cidrNum === 0 ? 0 : (~0 << (32 - cidrNum)) >>> 0;
        const network = (ipLong & mask) >>> 0;
        const broadcast = (network | ~mask) >>> 0;
        const firstHost = cidrNum >= 31 ? network : (network + 1) >>> 0;
        const lastHost = cidrNum >= 31 ? broadcast : (broadcast - 1) >>> 0;
        const totalHosts = cidrNum >= 31 ? (cidrNum === 32 ? 1 : 2) : Math.pow(2, 32 - cidrNum) - 2;

        const longToIp = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;

        res.json(success({
            network: longToIp(network),
            broadcast: longToIp(broadcast),
            netmask: longToIp(mask),
            firstHost: longToIp(firstHost),
            lastHost: longToIp(lastHost),
            totalHosts,
            cidr: cidrNum,
            wildcardMask: longToIp((~mask) >>> 0),
            ipClass: ipParts[0] < 128 ? 'A' : ipParts[0] < 192 ? 'B' : ipParts[0] < 224 ? 'C' : 'D/E',
            isPrivate: (ipParts[0] === 10) ||
                       (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
                       (ipParts[0] === 192 && ipParts[1] === 168)
        }));
    } catch (err) {
        res.status(500).json(fail('Subnet calculation failed'));
    }
});

module.exports = router;
