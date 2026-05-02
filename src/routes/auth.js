const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

// ─────────────────────────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const userRole = role === 'admin' ? 'admin' : 'member';

  try {
    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase(), hashed, userRole]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/login - Authenticate user & issue tokens
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    // Access token (short-lived, 15 minutes)
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    // Refresh token (long-lived, 7 days)
    const crypto = require('crypto');
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await pool.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [refreshToken, user.id, expiresAt]);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/refresh - Get a new access token
// ─────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
  
  try {
    const result = await pool.query('SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (result.rows.length === 0) return res.status(403).json({ error: 'Invalid refresh token' });
    
    const tokenData = result.rows[0];
    if (new Date() > new Date(tokenData.expires_at)) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return res.status(403).json({ error: 'Refresh token expired' });
    }
    
    const userRes = await pool.query('SELECT id, role FROM users WHERE id = $1', [tokenData.user_id]);
    if (userRes.rows.length === 0) return res.status(403).json({ error: 'User not found' });
    
    const user = userRes.rows[0];
    const newAccess = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    res.json({ token: newAccess });
  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
