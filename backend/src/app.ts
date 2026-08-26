import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { socialRouter } from './modules/social/social.routes.js';
import { trackerRouter } from './modules/tracker/tracker.routes.js';
import { feedRouter } from './modules/feed/feed.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Static Files (Vanilla HTML/CSS/JS frontend)
app.use(express.static(rootDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'BingeTracker Modular Monolith API' });
});

// Modular Routes Registration
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/social', socialRouter);
app.use('/api/tracker', trackerRouter);
app.use('/api/feed', feedRouter);
app.use('/api/media', mediaRouter);

// 404 Fallback for API or unmatched routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint bulunamadı.' });
});

app.use('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'app.html'));
});

