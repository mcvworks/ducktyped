const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

function success(data) { return { error: false, data }; }
function fail(msg) { return { error: true, message: msg }; }

// ============================================
// AI IMAGE DETECTION - COMBINED ANALYSIS
// ============================================
router.post('/detect', upload.single('image'), async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) return res.status(400).json(fail('No image uploaded'));
        filePath = req.file.path;

        const results = {};

        // 1. EXIF / Metadata Analysis (free, instant)
        try {
            const metadata = await sharp(filePath).metadata();
            const stats = await sharp(filePath).stats();

            results.metadata = {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                colorSpace: metadata.space,
                channels: metadata.channels,
                bitDepth: metadata.depth,
                hasAlpha: metadata.hasAlpha,
                density: metadata.density,
                // AI images often lack EXIF entirely
                hasExif: !!metadata.exif,
                hasIcc: !!metadata.icc,
                // Check for AI tool signatures in EXIF
                aiSignatures: []
            };

            // Parse EXIF if present
            if (metadata.exif) {
                try {
                    const ExifReader = require('exif-reader');
                    const exifData = ExifReader(metadata.exif);
                    results.metadata.exif = {
                        make: exifData?.image?.Make,
                        model: exifData?.image?.Model,
                        software: exifData?.image?.Software,
                        dateTime: exifData?.image?.DateTime,
                    };

                    // Check for known AI tool signatures
                    const software = (exifData?.image?.Software || '').toLowerCase();
                    const aiTools = ['stable diffusion', 'dall-e', 'midjourney', 'comfyui',
                                     'automatic1111', 'novelai', 'adobe firefly', 'invoke'];
                    for (const tool of aiTools) {
                        if (software.includes(tool)) {
                            results.metadata.aiSignatures.push(tool);
                        }
                    }
                } catch (e) {
                    results.metadata.exif = null;
                }
            }

            // Heuristic: AI images often have no EXIF, perfect dimensions, specific color profiles
            results.metadata.suspiciousFlags = [];
            if (!metadata.exif) results.metadata.suspiciousFlags.push('No EXIF data (common in AI images)');
            if (metadata.width === metadata.height) results.metadata.suspiciousFlags.push('Perfect square aspect ratio');
            if ([512, 768, 1024, 1536, 2048].includes(metadata.width) ||
                [512, 768, 1024, 1536, 2048].includes(metadata.height)) {
                results.metadata.suspiciousFlags.push(`Dimensions match common AI generation sizes (${metadata.width}x${metadata.height})`);
            }
        } catch (e) {
            results.metadata = { error: 'Could not read metadata' };
        }

        // 2. Error Level Analysis (free, computed locally)
        try {
            // ELA works by re-saving at a known quality and comparing
            const originalBuffer = await sharp(filePath).jpeg({ quality: 100 }).toBuffer();
            const resavedBuffer = await sharp(filePath).jpeg({ quality: 85 }).toBuffer();

            // Compute difference
            const original = await sharp(originalBuffer).raw().toBuffer();
            const resaved = await sharp(resavedBuffer).resize(
                (await sharp(originalBuffer).metadata()).width,
                (await sharp(originalBuffer).metadata()).height,
                { fit: 'fill' }
            ).raw().toBuffer();

            // Calculate average pixel difference
            let totalDiff = 0;
            const pixelCount = Math.min(original.length, resaved.length);
            for (let i = 0; i < pixelCount; i++) {
                totalDiff += Math.abs(original[i] - resaved[i]);
            }
            const avgDiff = totalDiff / pixelCount;

            // Generate ELA visualization image (amplified difference)
            const elaBuffer = Buffer.alloc(pixelCount);
            for (let i = 0; i < pixelCount; i++) {
                elaBuffer[i] = Math.min(255, Math.abs(original[i] - resaved[i]) * 10);
            }

            const elaMetadata = await sharp(originalBuffer).metadata();
            const elaImage = await sharp(elaBuffer, {
                raw: { width: elaMetadata.width, height: elaMetadata.height, channels: 3 }
            }).png().toBuffer();

            results.ela = {
                averageDifference: avgDiff.toFixed(2),
                uniformity: avgDiff < 5 ? 'high' : avgDiff < 15 ? 'medium' : 'low',
                interpretation: avgDiff < 5
                    ? 'Very uniform ELA — could indicate AI generation or heavy editing'
                    : avgDiff < 15
                    ? 'Moderate ELA variation — typical of real photographs'
                    : 'High ELA variation — likely a real photograph or composite',
                elaImageBase64: elaImage.toString('base64')
            };
        } catch (e) {
            results.ela = { error: 'ELA analysis failed' };
        }

        // 3. External AI Detection API (if configured)
        if (process.env.HIVE_API_KEY) {
            try {
                const imageBuffer = fs.readFileSync(filePath);
                const FormData = require('form-data');
                const form = new FormData();
                form.append('media', imageBuffer, { filename: 'image.jpg' });

                const hiveResp = await axios.post('https://api.thehive.ai/api/v2/task/sync', form, {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': `Token ${process.env.HIVE_API_KEY}`
                    },
                    timeout: 15000
                });

                const hiveData = hiveResp.data;
                results.aiDetection = {
                    provider: 'Hive Moderation',
                    results: hiveData
                };
            } catch (e) {
                results.aiDetection = { provider: 'Hive Moderation', error: 'API call failed' };
            }
        } else if (process.env.AIORNOT_API_KEY) {
            try {
                const imageBuffer = fs.readFileSync(filePath);
                const base64 = imageBuffer.toString('base64');

                const resp = await axios.post('https://api.aiornot.com/v1/reports/image', {
                    object: base64
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.AIORNOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });

                results.aiDetection = {
                    provider: 'AI or Not',
                    verdict: resp.data.verdict,
                    confidence: resp.data.ai?.confidence,
                    results: resp.data
                };
            } catch (e) {
                results.aiDetection = { provider: 'AI or Not', error: 'API call failed' };
            }
        } else {
            results.aiDetection = {
                provider: 'none',
                message: 'No AI detection API configured. Results based on metadata and ELA only.'
            };
        }

        // 4. Compute overall confidence score
        let aiScore = 50; // Start neutral
        const factors = [];

        // Metadata factors
        if (results.metadata.aiSignatures?.length > 0) {
            aiScore += 40;
            factors.push(`AI tool signature found in EXIF: ${results.metadata.aiSignatures.join(', ')}`);
        }
        if (results.metadata.suspiciousFlags?.length > 0) {
            aiScore += results.metadata.suspiciousFlags.length * 5;
            factors.push(...results.metadata.suspiciousFlags);
        }
        if (results.metadata.hasExif && results.metadata.exif?.make) {
            aiScore -= 20;
            factors.push(`Camera EXIF data found: ${results.metadata.exif.make} ${results.metadata.exif.model || ''}`);
        }

        // ELA factors
        if (results.ela && !results.ela.error) {
            const avgDiff = parseFloat(results.ela.averageDifference);
            if (avgDiff < 3) {
                aiScore += 10;
                factors.push('Very uniform compression (common in AI images)');
            } else if (avgDiff > 15) {
                aiScore -= 10;
                factors.push('Natural compression variation (typical of real photos)');
            }
        }

        // External API factors
        if (results.aiDetection?.verdict) {
            if (results.aiDetection.verdict === 'ai') {
                aiScore += 30;
                factors.push('AI detection API flagged as AI-generated');
            } else {
                aiScore -= 20;
                factors.push('AI detection API classified as human-created');
            }
        }

        aiScore = Math.max(0, Math.min(100, aiScore));

        results.overall = {
            aiProbability: aiScore,
            verdict: aiScore >= 75 ? 'Likely AI-Generated' :
                     aiScore >= 50 ? 'Possibly AI-Generated' :
                     aiScore >= 25 ? 'Probably Human-Created' : 'Likely Human-Created',
            factors
        };

        res.json(success(results));
    } catch (err) {
        console.error('AI detection error:', err);
        res.status(500).json(fail('AI detection failed'));
    } finally {
        // Clean up uploaded file
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

module.exports = router;
