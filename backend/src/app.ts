import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { socialRouter } from './modules/social/social.routes.js';
import { trackerRouter } from './modules/tracker/tracker.routes.js';
import { feedRouter } from './modules/feed/feed.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';

export const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

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

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint bulunamadı.' });
});
