// Kodak Ouami Backend Server
// Main server file with Express.js

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root
app.use(express.static('.'));

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'koudakouami@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

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

const testimonials = [
    {
        id: 1,
        name: 'James Otieno',
        role: 'Business Owner',
        text: 'Koudak Ouami delivered an amazing website for our business. Clean design, fast performance and very professional service.',
        rating: 5
    },
    {
        id: 2,
        name: 'Mary Wanjiku',
        role: 'Startup Founder',
        text: 'Their system development skills are top tier. Everything works smoothly and support is excellent.',
        rating: 4
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

// Get all testimonials
app.get('/api/testimonials', (req, res) => {
    res.json({
        success: true,
        data: testimonials
    });
});

// Contact form submission with validation
app.post('/api/contact', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('message').trim().notEmpty().withMessage('Message is required')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { name, email, phone, subject, message } = req.body;

    try {
        // Send email notification
        const mailOptions = {
            from: email,
            to: process.env.EMAIL_USER || 'koudakouami@gmail.com',
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">New Contact Form Submission</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${phone || 'Not provided'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Subject:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subject || 'General Inquiry'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Message:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${message}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; color: #666;">This email was sent from the Kodak Ouami contact form.</p>
                </div>
            `
        };

        // Send confirmation email to user
        const confirmationMailOptions = {
            from: process.env.EMAIL_USER || 'koudakouami@gmail.com',
            to: email,
            subject: 'Thank you for contacting Kodak Ouami',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">Thank You for Contacting Us!</h2>
                    <p>Dear ${name},</p>
                    <p>We have received your message and will get back to you as soon as possible.</p>
                    <p>Here's a copy of your message:</p>
                    <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #f25623;">
                        ${message}
                    </blockquote>
                    <p>Best regards,<br>The Kodak Ouami Team</p>
                </div>
            `
        };

        // Send both emails
        await transporter.sendMail(mailOptions);
        await transporter.sendMail(confirmationMailOptions);

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
        // Send subscription confirmation
        const mailOptions = {
            from: process.env.EMAIL_USER || 'koudakouami@gmail.com',
            to: email,
            subject: 'Welcome to Kodak Ouami Newsletter!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #f25623;">Welcome to Kodak Ouami!</h2>
                    <p>Thank you for subscribing to our newsletter.</p>
                    <p>You'll receive updates about our latest services, projects, and special offers.</p>
                    <p>Best regards,<br>The Kodak Ouami Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

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
