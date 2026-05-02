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

module.exports = router;
