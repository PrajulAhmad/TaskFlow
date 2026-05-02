const express = require('express');
const pool = require('../db');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /users (Admin only) - Used for adding members to projects
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY name ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /users/me - Update profile
// ─────────────────────────────────────────────────────────────
router.put('/me', authenticateUser, async (req, res) => {
  const { name, password } = req.body;
  try {
    let query = 'UPDATE users SET name = $1';
    let params = [name || req.user.name];
    if (password && password.length >= 6) {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);
      query += ', password_hash = $2 WHERE id = $3';
      params.push(hashed, req.user.id);
    } else {
      query += ' WHERE id = $2';
      params.push(req.user.id);
    }
    await pool.query(query, params);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
