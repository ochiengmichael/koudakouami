// Kodak Ouami Backend Server
// Main server file with Express.js

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.EMAIL_USER || 'koudakouami@gmail.com';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const DATA_DIR = path.join(__dirname, 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const REVIEW_RATE_LIMIT = 3;
const REVIEW_RATE_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_MAX_LENGTH = 500;
const clientRateLimits = new Map();

const ensureReviewStore = () => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(REVIEWS_FILE)) {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify({ reviews: [] }, null, 2), 'utf8');
    }
};

const loadReviews = () => {
    ensureReviewStore();
    try {
        const data = JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8').replace(/^\uFEFF/, ''));
        return Array.isArray(data.reviews) ? data.reviews : [];
    } catch (error) {
        console.error('Failed to read review store. Resetting store.', error);
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify({ reviews: [] }, null, 2), 'utf8');
        return [];
    }
};

const saveReviews = (reviews) => {
    ensureReviewStore();
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify({ reviews }, null, 2), 'utf8');
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
};

const sanitizeText = (value, maxLength) => {
    const text = String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return text.slice(0, maxLength);
};

const isWithinRateLimit = (req) => {
    const key = getClientIp(req);
    const now = Date.now();
    const bucket = clientRateLimits.get(key) || [];
    const recent = bucket.filter((timestamp) => now - timestamp < REVIEW_RATE_WINDOW_MS);

    if (recent.length >= REVIEW_RATE_LIMIT) {
        clientRateLimits.set(key, recent);
        return false;
    }

    recent.push(now);
    clientRateLimits.set(key, recent);
    return true;
};

const getApprovedReviews = () => {
    const reviews = loadReviews();
    return reviews
        .filter((review) => review.status === 'approved')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getReviewStats = (reviews) => {
    if (!reviews.length) {
        return { total: 0, averageRating: 0, averageRatingLabel: '0.0' };
    }

    const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
    const averageRating = totalRating / reviews.length;

    return {
        total: reviews.length,
        averageRating: Number(averageRating.toFixed(1)),
        averageRatingLabel: Number(averageRating.toFixed(1)).toFixed(1)
    };
};

const requireAdminAccess = (req, res, next) => {
    if (!ADMIN_API_KEY) {
        return res.status(503).json({
            success: false,
            message: 'Review moderation is not configured.'
        });
    }

    const adminKey = req.get('x-admin-key');

    if (!adminKey || adminKey !== ADMIN_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized admin access.'
        });
    }

    return next();
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendEmail = async ({ to, subject, html, replyTo }) => {
    if (!RESEND_API_KEY) {
        throw new Error('Email delivery is not configured. Set RESEND_API_KEY in the server environment.');
    }

    if (!EMAIL_FROM) {
        throw new Error('Email sender is not configured. Set EMAIL_FROM to an address on a verified Resend domain.');
    }

    const response = await fetch(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: EMAIL_FROM,
            to: [to],
            subject,
            html,
            ...(replyTo ? { reply_to: replyTo } : {})
        }),
        signal: AbortSignal.timeout(10000)
    });

    const responseText = await response.text();
    let result = {};
    if (responseText) {
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error('Email provider returned an invalid response.');
        }
    }

    if (!response.ok) {
        const providerMessage = typeof result.message === 'string' ? result.message : 'Email provider rejected the request.';
        throw new Error(providerMessage);
    }

    return result;
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from root
app.use(express.static(__dirname));

// In-memory data storage (replace with database in production)
const services = [
    {
        id: 1,
        title: 'Web Development',
        description: 'Responsive and interactive websites for all devices.',
        icon: '💻',
        image: './images/web-dev.png'
    },
    {
        id: 2,
        title: 'System Development',
        description: 'Custom software solutions for your business needs.',
        icon: '⚙️',
        image: './images/system-dev.png'
    },
    {
        id: 3,
        title: 'Networking',
        description: 'Reliable IT infrastructure and network solutions.',
        icon: '🌐',
        image: './images/networking.png'
    }
];

const projects = [
    {
        id: 1,
        title: 'Final Website',
        description: 'A responsive and interactive website with modern UI/UX.',
        image: './images/website project 1.jpg'
    },
    {
        id: 2,
        title: 'Custom System',
        description: 'Robust software solution tailored for business needs.',
        image: './images/system project2.jpg'
    },
    {
        id: 3,
        title: 'Networking Setup',
        description: 'Reliable IT infrastructure for smooth business operations.',
        image: './images/network project 3.jpg'
    }
];

// ============ API ROUTES ============

// Get all services
app.get('/api/services', (req, res) => {
    res.json({
        success: true,
        data: services
    });
});

// Get single service
app.get('/api/services/:id', (req, res) => {
    const service = services.find(s => s.id === parseInt(req.params.id));
    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
});

// Get all projects
app.get('/api/projects', (req, res) => {
    res.json({
        success: true,
        data: projects
    });
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
    const project = projects.find(p => p.id === parseInt(req.params.id));
    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
});

app.get('/api/reviews', (req, res) => {
    const reviews = getApprovedReviews();
    const stats = getReviewStats(reviews);

    res.json({
        success: true,
        data: reviews.map((review) => ({
            id: review.id,
            name: review.name,
            service: review.service || 'Client Experience',
            rating: review.rating,
            text: review.text,
            createdAt: review.createdAt
        })),
        stats
    });
});

app.get('/api/reviews/admin', requireAdminAccess, (req, res) => {
    const reviews = loadReviews().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({
        success: true,
        data: reviews,
        stats: getReviewStats(reviews)
    });
});

app.post('/api/reviews', [
    body('name').trim().notEmpty().withMessage('Display name is required.'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    body('service').optional({ values: 'falsy' }).trim(),
    body('text').trim().notEmpty().withMessage('Please share your experience.'),
    body('text').trim().isLength({ min: 10, max: REVIEW_MAX_LENGTH }).withMessage('Review must be between 10 and 500 characters.')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Please correct the review details.',
            errors: errors.array()
        });
    }

    if (!isWithinRateLimit(req)) {
        return res.status(429).json({
            success: false,
            message: 'Too many reviews submitted recently. Please try again later.'
        });
    }

    const reviews = loadReviews();
    const name = sanitizeText(req.body.name, 80);
    const service = sanitizeText(req.body.service || 'Client Experience', 80);
    const text = sanitizeText(req.body.text, REVIEW_MAX_LENGTH);
    const rating = Number.parseInt(req.body.rating, 10);
    const candidateKey = `${name.toLowerCase()}|${text.toLowerCase()}`;
    const duplicate = reviews.some((review) => {
        const sameText = review.text.toLowerCase() === text.toLowerCase();
        const sameName = review.name.toLowerCase() === name.toLowerCase();
        const recentWithinWindow = Date.now() - new Date(review.createdAt).getTime() < 24 * 60 * 60 * 1000;
        return review.status !== 'rejected' && sameText && sameName && recentWithinWindow;
    });

    if (duplicate) {
        return res.status(409).json({
            success: false,
            message: 'This review appears to be a duplicate. Please submit a unique experience.'
        });
    }

    const review = {
        id: crypto.randomUUID(),
        name,
        service,
        rating,
        text,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ipHash: crypto.createHash('sha256').update(getClientIp(req)).digest('hex').slice(0, 16)
    };

    reviews.unshift(review);
    saveReviews(reviews);

    return res.status(201).json({
        success: true,
        message: 'Thanks for sharing your feedback. Your review is pending approval and will appear after moderation.',
        data: review
    });
});

app.patch('/api/reviews/:id', requireAdminAccess, [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Status update failed.',
            errors: errors.array()
        });
    }

    const reviews = loadReviews();
    const review = reviews.find((item) => item.id === req.params.id);

    if (!review) {
        return res.status(404).json({
            success: false,
            message: 'Review not found.'
        });
    }

    review.status = req.body.status;
    review.updatedAt = new Date().toISOString();
    if (req.body.status === 'approved') {
        review.approvedAt = new Date().toISOString();
        review.rejectedAt = null;
    }
    if (req.body.status === 'rejected') {
        review.rejectedAt = new Date().toISOString();
        review.approvedAt = null;
    }

    saveReviews(reviews);

    return res.json({
        success: true,
        message: `Review ${req.body.status}.`,
        data: review
    });
});

// Contact form submission with validation
app.post('/api/contact', [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required and must be 100 characters or fewer.'),
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Subject must be 120 characters or fewer.'),
    body('message').trim().notEmpty().isLength({ max: 5000 }).withMessage('Message is required and must be 5000 characters or fewer.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { name, email, phone, subject, message } = req.body;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || 'Not provided');
    const safeSubject = escapeHtml(subject || 'General inquiry');
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

    try {
        await sendEmail({
            to: CONTACT_EMAIL,
            replyTo: email,
            subject: `New contact request from ${String(name).replace(/[\r\n]/g, ' ').slice(0, 100)}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">New Contact Form Submission</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeEmail}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safePhone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Subject:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeSubject}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Message:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeMessage}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; color: #666;">This email was sent from the Kodak Ouami contact form.</p>
                </div>
            `
        });

        await sendEmail({
            to: email,
            replyTo: CONTACT_EMAIL,
            subject: 'Thank you for contacting Kodak Ouami',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">Thank You for Contacting Us!</h2>
                    <p>Dear ${safeName},</p>
                    <p>We have received your message and will get back to you as soon as possible.</p>
                    <p>Here's a copy of your message:</p>
                    <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #f25623;">
                        ${safeMessage}
                    </blockquote>
                    <p>Best regards,<br>The Kodak Ouami Team</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.'
        });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
});

// Subscribe to newsletter
app.post('/api/subscribe', [
    body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email address'
        });
    }

    const { email } = req.body;

    try {
        await sendEmail({
            to: email,
            replyTo: CONTACT_EMAIL,
            subject: 'Welcome to Kodak Ouami Newsletter!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">Welcome to Kodak Ouami!</h2>
                    <p>Thank you for subscribing to our newsletter.</p>
                    <p>You'll receive updates about our latest services, projects, and special offers.</p>
                    <p>Best regards,<br>The Kodak Ouami Team</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'Successfully subscribed to newsletter!'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to subscribe. Please try again.'
        });
    }
});

// Get company info
app.get('/api/company', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'Kodak Ouami',
            founded: '2024',
            founder: 'Michael Ochieng',
            email: 'koudakouami@gmail.com',
            phone: '+254712345678',
            whatsapp: '+254712345678',
            address: 'Kenya',
            description: 'Providing tech solutions to businesses and individuals, combining design and IT infrastructure expertise.',
            social: {
                facebook: 'https://facebook.com/kodakouami',
                twitter: 'https://twitter.com/kodakouami',
                instagram: 'https://instagram.com/kodakouami',
                linkedin: 'https://linkedin.com/company/kodakouami'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Kodak Ouami Server running on http://localhost:${PORT}`);
    console.log(`📧 Contact API: http://localhost:${PORT}/api/contact`);
    console.log(`Services API: http://localhost:${PORT}/api/services`);
    console.log(`📁 Projects API: http://localhost:${PORT}/api/projects`);
});

module.exports = app;
