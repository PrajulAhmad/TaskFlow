require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes     = require('./src/routes/auth');
const projectRoutes  = require('./src/routes/projects');
const taskRoutes     = require('./src/routes/tasks');
const userRoutes     = require('./src/routes/users');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Static frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── 404 fallback (SPA support) ────────────────────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
