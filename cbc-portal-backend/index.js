// index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';



// Limit repeated requests to public APIs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
});

// ✅ Minimal CORS setup for single-domain deployment
app.use(cors({
  origin: true,          // automatically reflects the request origin (same domain)
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));


import userRoutes from './routes/userRoutes.js';
import markRoutes from './routes/markRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import resetRoutes from './routes/resetRoutes.js';
import refreshRoutes from "./routes/refresh.js";
import cookieParser from "cookie-parser";

dotenv.config();

// ---------------------------
// Resolve __dirname in ES module
// ---------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log the current file path
console.log('Running index.js from:', __filename);

const app = express();
app.use(express.json());
app.use(cors());

// Apply security headers
app.use(helmet());
// Apply to all /api routes
app.use('/api', limiter);

// ---------------------------
// Serve backend static files
// ---------------------------
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------
// API Routes
// ---------------------------
app.use('/api/users', userRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/reset', resetRoutes);
app.use("/api/refresh", refreshRoutes);
app.use(cookieParser());
// ---------------------------
// Serve FRONTEND SPA with cache control
// ---------------------------
const frontendPath = path.join(__dirname, '../frontend');

app.use(
  express.static(frontendPath, {
    maxAge: '30d', // tell browsers to cache static assets for 30 days
    setHeaders: (res, filePath) => {
      // Ensure cache headers are applied
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days in seconds
    },
  })
);

// ✅ Catch-all for frontend routing (placed AFTER API routes)
app.get('', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
// ---------------------------
// Connect to MongoDB + Start Server
// ---------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch(err => console.error('MongoDB connection error:', err));