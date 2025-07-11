const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const OWNER_USERNAME = process.env.OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'password123';
const MASTER_KEY = process.env.MASTER_KEY || 'YOUR_SUPER_SECRET_MASTER_KEY';

let apiKeys = {
    "zeetasi-free-key": { type: "free", requests: 0, limit: 100 },
};

const validateApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ status: false, message: "API Key required." });
    const keyData = apiKeys[key];
    if (!keyData) return res.status(403).json({ status: false, message: "Invalid API Key." });
    if (keyData.type === 'free' && keyData.requests >= keyData.limit) {
        return res.status(429).json({ status: false, message: "Request limit reached for this key." });
    }
    keyData.requests++;
    next();
};

const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/tiktok', validateApiKey, async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, message: "Parameter 'url' is required." });
    res.json({ status: true, developer: "Zeetasi", result: { title: "Dummy TikTok Video", author: "zeetasi", nowm_url: "example.com/video.mp4" } });
});

app.get('/api/instagram', validateApiKey, async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ status: false, message: "Parameter 'url' is required." });
    res.json({ status: true, developer: "Zeetasi", result: { username: "zeetasi", type: "Reels", media_url: "example.com/reels.mp4" } });
});

app.post('/api/upload-image', validateApiKey, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: false, message: 'No image file uploaded.' });

    let stream = cloudinary.uploader.upload_stream({ folder: 'zeetasi' }, (error, result) => {
        if (error) return res.status(500).json({ status: false, message: error.message });
        return res.json({ status: true, url: result.secure_url });
    });
    streamifier.createReadStream(req.file.buffer).pipe(stream);
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === OWNER_USERNAME && password === OWNER_PASSWORD) {
        res.status(200).json({ status: true, message: "Login successful." });
    } else {
        res.status(401).json({ status: false, message: "Invalid username or password." });
    }
});

app.post('/admin/create-key', (req, res) => {
    const { masterKey } = req.body;
    if (masterKey !== MASTER_KEY) {
        return res.status(401).json({ status: false, message: "Invalid Master Key." });
    }
    const newKey = `zt-premium-${Math.random().toString(36).substring(2, 15)}`;
    apiKeys[newKey] = { type: "premium", requests: 0, limit: Infinity };
    res.status(201).json({ status: true, newKey: newKey });
});

module.exports = app;