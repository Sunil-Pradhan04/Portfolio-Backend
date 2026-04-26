const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://sunil-pradhan04.github.io'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT verification middleware (used by edit routes)
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    }
};

// Vercel Serverless MongoDB Connection caching
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        isConnected = db.connections[0].readyState === 1;
        console.log('✅ MongoDB connected');
        // Only seed if we actually had to reconnect/cold start
        if (isConnected) await seedInitialData();
    } catch (err) {
        console.error('❌ MongoDB error:', err);
    }
};

// Ensure DB is connected before handling any API requests
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/info', require('./routes/portfolioInfo'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Portfolio API running 🚀', status: 'OK' });
});

// (MongoDB connection logic is now handled via the connectDB middleware above)

async function seedInitialData() {
    const Project = require('./models/Project');
    const Skill = require('./models/Skill');
    const PortfolioInfo = require('./models/PortfolioInfo');

    // Seed PortfolioInfo if empty
    const infoCount = await PortfolioInfo.countDocuments();
    if (infoCount === 0) {
        console.log('🌱 Seeding portfolio info...');
        await PortfolioInfo.create({});
        console.log('✅ Portfolio info seeded');
    }

    const projectCount = await Project.countDocuments();
    if (projectCount === 0) {
        console.log('🌱 Seeding initial projects...');
        await Project.insertMany([
            {
                name: 'EVENT',
                tagline: 'Full-Stack Event Management System',
                shortDescription: 'Complete event management platform with role-based authentication, AI-powered recommendations, and real-time notifications.',
                fullDescription: `EVENT is a comprehensive full-stack event management system designed to streamline event organization and participation. The platform features role-based authentication supporting both Students and Teachers, allowing admins to create and manage events while users can discover and register for events that match their interests.\n\nThe system includes advanced AI-powered features using OpenAI and Pinecone vector database to provide intelligent event recommendations based on user preferences and past interactions. With a secure JWT-based authentication system, email verification workflow, and password reset functionality, the platform ensures both security and user convenience.\n\nBuilt with a modern tech stack and deployed on Vercel, EVENT demonstrates proficiency in full-stack development, database design, API integration, and cloud deployment.`,
                techStack: {
                    frontend: ['React.js', 'Redux Toolkit', 'React Router', 'React Icons', 'Vite'],
                    backend: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose'],
                    authentication: ['JWT', 'bcryptjs', 'express-session', 'cookie-parser'],
                    ai: ['OpenAI API', 'Pinecone Vector Database'],
                    email: ['Nodemailer'],
                    deployment: ['Vercel']
                },
                features: [
                    'Role-based authentication (Student & Teacher roles)',
                    'Email verification system for new users',
                    'Secure password reset flow with email verification',
                    'Event CRUD operations for admins/teachers',
                    'Event registration and management for students',
                    'AI-powered event recommendations using OpenAI',
                    'Vector similarity search with Pinecone database',
                    'Real-time session management with JWT',
                    'Responsive design for all devices',
                    'Toast notifications for user feedback',
                    'Protected routes with authentication middleware',
                    'RESTful API architecture with 20+ endpoints'
                ],
                challenges: [
                    'Implementing secure JWT-based authentication with refresh tokens',
                    'Integrating AI recommendations using vector embeddings',
                    'Managing complex state with Redux Toolkit',
                    'Handling email verification workflows',
                    'Optimizing database queries for event filtering'
                ],
                liveUrl: 'https://event-management-frontend-eqe7.vercel.app/',
                githubUrl: 'https://github.com/Sunil-Pradhan04/EventManagement-Frontend',
                category: 'Full Stack',
                icon: '🎯',
                order: 1
            },
            {
                name: 'VISTORA',
                tagline: 'Modern Social Media Platform',
                shortDescription: 'Feature-rich social media application with video sharing, photo galleries, and real-time content discovery.',
                fullDescription: `VISTORA is a modern social media platform that brings together content sharing, discovery, and user interaction in a sleek, intuitive interface. The platform supports multiple content types including traditional posts, short-form videos (similar to Instagram Reels/YouTube Shorts), and photo galleries.\n\nBuilt with React and Bootstrap, VISTORA features a responsive design that works seamlessly across devices. Users can explore content through a dynamic home feed, watch engaging short videos, browse photo galleries, manage their profiles, and discover new content through an intelligent search system.\n\nThe application demonstrates strong frontend development skills, effective state management using React Context API, and modern UI/UX design principles. Deployed on GitHub Pages, VISTORA showcases the ability to create engaging, user-friendly social platforms.`,
                techStack: {
                    frontend: ['React.js', 'React Router', 'Bootstrap 5', 'React Icons', 'Vite'],
                    stateManagement: ['React Context API'],
                    deployment: ['GitHub Pages']
                },
                features: [
                    'Dynamic home feed with post rendering',
                    'Short-form video player (Shorts) with swipe navigation',
                    'Photo gallery with grid layout',
                    'User profile management',
                    'Search functionality for content discovery',
                    'Responsive sidebar navigation',
                    'Content sharing and interaction',
                    'Smooth page transitions',
                    'Mobile-first responsive design',
                    'Clean and modern UI/UX',
                    'Fast loading with optimized assets'
                ],
                challenges: [
                    'Implementing smooth video playback for shorts',
                    'Managing global state with Context API',
                    'Creating responsive layouts for different content types',
                    'Optimizing performance for image-heavy pages',
                    'Designing intuitive navigation patterns'
                ],
                liveUrl: 'https://Sunil-Pradhan04.github.io/VISTORA',
                githubUrl: 'https://github.com/Sunil-Pradhan04/VISTORA',
                category: 'Frontend',
                icon: '📱',
                order: 2
            }
        ]);
        console.log('✅ Projects seeded');
    }

    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
        console.log('🌱 Seeding initial skills...');
        await Skill.insertMany([
            { name: 'MERN Stack', percentage: 90, color: 'blue', details: 'MongoDB, Express.js, React.js, Node.js', iconKey: 'mern', order: 1 },
            { name: 'React Native', percentage: 60, color: 'purple', details: 'Mobile app development with React Native', iconKey: 'react', order: 2 },
            { name: 'AI/ML', percentage: 20, color: 'pink', details: 'Artificial Intelligence & Machine Learning basics', badge: 'Beginner', iconKey: 'ai', order: 3 }
        ]);
        console.log('✅ Skills seeded');
    }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Portfolio API running on http://localhost:${PORT}`);
});

// Export the app for Vercel Serverless Functions
module.exports = app;
