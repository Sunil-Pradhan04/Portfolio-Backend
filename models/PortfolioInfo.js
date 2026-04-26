const mongoose = require('mongoose');

const portfolioInfoSchema = new mongoose.Schema({
    // Hero section
    name: { type: String, default: 'Sunil Pradhan' },
    greeting: { type: String, default: "Hi, I'm" },
    roles: { type: [String], default: ['Full Stack Developer', 'React Native Developer', 'AI Enthusiast'] },
    rolePrefix: { type: String, default: 'Creative' },
    heroTagline: { type: String, default: 'Curious mind. Creative Code. Constantly improving.\nLearning by building. Growing through code.' },

    // About section
    aboutHeading: { type: String, default: 'Who am I?' },
    aboutPara1: { type: String, default: "Hi, I'm <strong>Sunil Pradhan</strong>, a B.Tech student at GEC Autonomous College with a passion for coding and creating smart, user-friendly applications. I love turning ideas into real projects and continuously explore new technologies to grow as a developer." },
    aboutPara2: { type: String, default: "I'm especially interested in full-stack development and enjoy learning through hands-on experience. My goal is to build impactful solutions that combine creativity, performance, and real-world value." },

    // Contact / personal info
    email: { type: String, default: 'sunilpradhanpersonal@gmail.com' },
    location: { type: String, default: 'Odisha, India' },
    locationMapUrl: { type: String, default: 'https://maps.app.goo.gl/mTt8xaoqpJWRsuTJ9' },

    // Social links
    githubUrl: { type: String, default: 'https://github.com/Sunil-Pradhan04' },
    linkedinUrl: { type: String, default: 'https://www.linkedin.com/in/sunil-pradhan-174364338' },

    // Footer
    footerTagline: { type: String, default: 'Building meaningful things, one commit at a time.' }

}, { timestamps: true });

module.exports = mongoose.model('PortfolioInfo', portfolioInfoSchema);
