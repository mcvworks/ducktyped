require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// CORS — only allow your frontend
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'https://ducktyped.xyz',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiter
const rateLimiter = new RateLimiterMemory({
    points: parseInt(process.env.RATE_LIMIT_MAX) || 30,
    duration: parseInt(process.env.RATE_LIMIT_WINDOW) || 60,
});

app.use(async (req, res, next) => {
    try {
        const ip = req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.ip;
        await rateLimiter.consume(ip);
        next();
    } catch (err) {
        res.status(429).json({
            error: true,
            message: 'Too many requests. Please slow down.',
            retryAfter: Math.ceil(err.msBeforeNext / 1000)
        });
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Clean up old uploads every 10 minutes
setInterval(() => {
    const now = Date.now();
    fs.readdirSync(uploadsDir).forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > 10 * 60 * 1000) { // 10 min old
            fs.unlinkSync(filePath);
        }
    });
}, 10 * 60 * 1000);

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ error: false, data: { status: 'ok', timestamp: new Date().toISOString(), version: '2.0' } });
});

// Mount route modules
app.use('/api/network', require('./routes/network'));
app.use('/api/security', require('./routes/security'));
app.use('/api/email', require('./routes/email'));
app.use('/api/web', require('./routes/web'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/encoding', require('./routes/encoding'));
app.use('/api/generators', require('./routes/generators'));

// ============================================
// LEGACY COMPATIBILITY LAYER
// ============================================
// Your current frontend calls: POST WORKER_URL?tool=dns
// This adapter translates old-style calls to new routes
// so you can migrate gradually without breaking existing tools

app.post('/', (req, res) => {
    const tool = req.query.tool;
    const body = req.body;
    
    const toolRouteMap = {
        'dns':        '/api/network/dns',
        'whois':      '/api/security/whois',
        'ssl':        '/api/security/ssl',
        'port':       '/api/network/port-scan',
        'ping':         '/api/network/ping',
        'http-latency': '/api/network/http-latency',
        'isp':        '/api/network/isp',
        'mac':        '/api/network/mac',
        'smtp':       '/api/email/smtp-check',
        'urlstatus':  '/api/web/url-status',
        'redirect':   '/api/web/redirects',
        'metadata':   '/api/web/metadata',
        'traceroute': '/api/network/traceroute',
        'reversedns': '/api/network/reverse-dns',
        'subnet':     '/api/network/subnet',
        'secheaders': '/api/security/security-headers',
        'breachcheck':'/api/security/breach-check',
        'blacklist':  '/api/email/blacklist',
        'techdetect': '/api/web/tech-detect',
        'robots':     '/api/web/robots',
    };

    const route = toolRouteMap[tool];
    if (!route) {
        return res.status(400).json({ error: true, message: `Unknown tool: ${tool}` });
    }

    // Forward internally
    req.url = route;
    app.handle(req, res);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: true, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
});

// ============================================
// START
// ============================================
app.listen(PORT, '127.0.0.1', () => {
    console.log(`duckTyped API running on port ${PORT}`);
});
