const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URL } = require('url');
const NodeCache = require('node-cache');
const { success, fail, validateUrl } = require('../utils');

const cache = new NodeCache({ stdTTL: 3600 });

// ============================================
// SECURITY HEADERS — (already in security.js, cross-reference)
// ============================================

// ============================================
// HTTP HEADER INSPECTOR
// ============================================
router.post('/headers', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const resp = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: () => true,
            headers: { 'User-Agent': 'duckTyped/1.0' }
        });

        res.json(success({
            url,
            statusCode: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
            headerCount: Object.keys(resp.headers).length
        }));
    } catch (err) {
        res.status(500).json(fail('Failed to fetch headers'));
    }
});

// ============================================
// REDIRECT CHAIN TRACER
// ============================================
router.post('/redirects', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const chain = [];
        let currentUrl = url;
        let hops = 0;
        const maxHops = 15;

        while (hops < maxHops) {
            const resp = await axios.get(currentUrl, {
                timeout: 8000,
                maxRedirects: 0,
                validateStatus: () => true,
                headers: { 'User-Agent': 'duckTyped/1.0' }
            });

            chain.push({
                url: currentUrl,
                statusCode: resp.status,
                statusText: resp.statusText,
                server: resp.headers['server'] || null
            });

            if ([301, 302, 303, 307, 308].includes(resp.status) && resp.headers.location) {
                currentUrl = new URL(resp.headers.location, currentUrl).toString();
                hops++;
            } else {
                break;
            }
        }

        res.json(success({ originalUrl: url, finalUrl: currentUrl, hops: chain.length - 1, chain }));
    } catch (err) {
        res.status(500).json(fail('Redirect check failed'));
    }
});

// ============================================
// WEBSITE METADATA EXTRACTOR
// ============================================
router.post('/metadata', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const resp = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'duckTyped/1.0' },
            maxContentLength: 5 * 1024 * 1024 // 5MB max
        });

        const html = resp.data;
        const extract = (regex) => { const m = html.match(regex); return m ? m[1]?.trim() : null; };

        res.json(success({
            url,
            title: extract(/<title[^>]*>(.*?)<\/title>/is),
            description: extract(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is),
            ogTitle: extract(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is),
            ogDescription: extract(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is),
            ogImage: extract(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/is),
            ogType: extract(/<meta[^>]*property=["']og:type["'][^>]*content=["'](.*?)["']/is),
            twitterCard: extract(/<meta[^>]*name=["']twitter:card["'][^>]*content=["'](.*?)["']/is),
            canonical: extract(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/is),
            favicon: extract(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["'](.*?)["']/is),
            robots: extract(/<meta[^>]*name=["']robots["'][^>]*content=["'](.*?)["']/is),
            generator: extract(/<meta[^>]*name=["']generator["'][^>]*content=["'](.*?)["']/is),
            language: extract(/<html[^>]*lang=["'](.*?)["']/is),
            charset: extract(/<meta[^>]*charset=["'](.*?)["']/is),
        }));
    } catch (err) {
        res.status(500).json(fail('Metadata extraction failed'));
    }
});

// ============================================
// TECHNOLOGY STACK DETECTOR
// ============================================
router.post('/tech-detect', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const cacheKey = `tech:${url}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(success(cached));

        const resp = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'duckTyped/1.0' },
            maxContentLength: 5 * 1024 * 1024
        });

        const html = resp.data;
        const headers = resp.headers;
        const detected = [];

        // Header-based detection
        const headerSignatures = {
            'x-powered-by': { 'express': 'Express.js', 'php': 'PHP', 'asp.net': 'ASP.NET', 'next.js': 'Next.js' },
            'server': { 'nginx': 'Nginx', 'apache': 'Apache', 'cloudflare': 'Cloudflare', 'iis': 'Microsoft IIS', 'vercel': 'Vercel', 'netlify': 'Netlify' },
            'x-vercel-id': { '': 'Vercel' },
            'x-nf-request-id': { '': 'Netlify' },
        };
        for (const [header, sigs] of Object.entries(headerSignatures)) {
            const val = (headers[header] || '').toLowerCase();
            if (!val) continue;
            for (const [sig, name] of Object.entries(sigs)) {
                if (sig === '' || val.includes(sig)) detected.push({ name, category: 'Server/Hosting', evidence: `${header}: ${headers[header]}` });
            }
        }

        // HTML-based detection
        const htmlSignatures = [
            { pattern: /wp-content|wordpress/i, name: 'WordPress', category: 'CMS' },
            { pattern: /react/i, name: 'React', category: 'JS Framework' },
            { pattern: /__next/i, name: 'Next.js', category: 'JS Framework' },
            { pattern: /__nuxt|nuxt/i, name: 'Nuxt.js', category: 'JS Framework' },
            { pattern: /vue\.js|v-bind|v-on/i, name: 'Vue.js', category: 'JS Framework' },
            { pattern: /angular|ng-version/i, name: 'Angular', category: 'JS Framework' },
            { pattern: /svelte/i, name: 'Svelte', category: 'JS Framework' },
            { pattern: /jquery/i, name: 'jQuery', category: 'JS Library' },
            { pattern: /bootstrap/i, name: 'Bootstrap', category: 'CSS Framework' },
            { pattern: /tailwindcss|tailwind/i, name: 'Tailwind CSS', category: 'CSS Framework' },
            { pattern: /cloudflare/i, name: 'Cloudflare', category: 'CDN/Security' },
            { pattern: /google-analytics|gtag|ga\.js/i, name: 'Google Analytics', category: 'Analytics' },
            { pattern: /googletagmanager/i, name: 'Google Tag Manager', category: 'Analytics' },
            { pattern: /hotjar/i, name: 'Hotjar', category: 'Analytics' },
            { pattern: /shopify/i, name: 'Shopify', category: 'E-commerce' },
            { pattern: /wix\.com/i, name: 'Wix', category: 'Website Builder' },
            { pattern: /squarespace/i, name: 'Squarespace', category: 'Website Builder' },
            { pattern: /stripe/i, name: 'Stripe', category: 'Payment' },
            { pattern: /recaptcha/i, name: 'reCAPTCHA', category: 'Security' },
            { pattern: /cloudflare-static/i, name: 'Cloudflare Pages', category: 'Hosting' },
        ];
        for (const sig of htmlSignatures) {
            if (sig.pattern.test(html)) {
                detected.push({ name: sig.name, category: sig.category, evidence: 'HTML content' });
            }
        }

        // Deduplicate
        const unique = [...new Map(detected.map(d => [d.name, d])).values()];
        const result = { url, technologies: unique, count: unique.length };

        cache.set(cacheKey, result, 3600);
        res.json(success(result));
    } catch (err) {
        res.status(500).json(fail('Technology detection failed'));
    }
});

// ============================================
// ROBOTS.TXT & SITEMAP ANALYZER
// ============================================
router.post('/robots', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const baseUrl = new URL(url).origin;

        let robotsTxt = null, sitemapUrl = null, sitemapData = null;

        // Fetch robots.txt
        try {
            const resp = await axios.get(`${baseUrl}/robots.txt`, { timeout: 5000, validateStatus: () => true });
            if (resp.status === 200) {
                robotsTxt = resp.data;
                const sitemapMatch = resp.data.match(/Sitemap:\s*(.+)/i);
                if (sitemapMatch) sitemapUrl = sitemapMatch[1].trim();
            }
        } catch (e) {}

        // Fetch sitemap
        if (sitemapUrl) {
            try {
                const resp = await axios.get(sitemapUrl, { timeout: 5000, maxContentLength: 2 * 1024 * 1024 });
                const urls = [...resp.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
                sitemapData = { url: sitemapUrl, urlCount: urls.length, sampleUrls: urls.slice(0, 20) };
            } catch (e) {}
        }

        res.json(success({ baseUrl, robotsTxt, sitemap: sitemapData }));
    } catch (err) {
        res.status(500).json(fail('Analysis failed'));
    }
});

// ============================================
// URL STATUS / SAFETY CHECK
// ============================================
router.post('/url-status', async (req, res) => {
    try {
        const check = await validateUrl(req.body.url);
        if (!check.valid) return res.status(400).json(fail(check.reason));
        const url = check.url;

        const startTime = Date.now();
        const resp = await axios.get(url, {
            timeout: 10000,
            validateStatus: () => true,
            headers: { 'User-Agent': 'duckTyped/1.0' }
        });
        const responseTime = Date.now() - startTime;

        let virusTotalResult = null;
        if (process.env.VIRUSTOTAL_API_KEY) {
            try {
                const vtResp = await axios.get(
                    `https://www.virustotal.com/api/v3/urls/${Buffer.from(url).toString('base64').replace(/=/g, '')}`,
                    { headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY }, timeout: 10000 }
                );
                virusTotalResult = vtResp.data?.data?.attributes?.last_analysis_stats;
            } catch (e) {}
        }

        res.json(success({
            url,
            statusCode: resp.status,
            statusText: resp.statusText,
            responseTime,
            contentType: resp.headers['content-type'],
            contentLength: resp.headers['content-length'],
            server: resp.headers['server'],
            virusTotal: virusTotalResult
        }));
    } catch (err) {
        res.status(500).json(fail('URL check failed'));
    }
});

module.exports = router;
