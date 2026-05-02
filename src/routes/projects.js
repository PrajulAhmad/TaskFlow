const express = require('express');
const pool = require('../db');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /projects  (admin only)
// ─────────────────────────────────────────────────────────────
router.post('/', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Project name must be at least 3 characters' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description || null, req.user.id]
    );

    const project = result.rows[0];

    // Auto-add creator as admin member of the project
    await pool.query(
      `INSERT INTO project_members (user_id, project_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT DO NOTHING`,
      [req.user.id, project.id]
    );

    return res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /projects  (only projects where user is a member)
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role AS member_role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get projects error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /projects/:id  (admin only)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    // Ensure the admin owns / is member of this project
    const membership = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'`,
      [id, req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /projects/:id/members  (admin only)
// ─────────────────────────────────────────────────────────────
router.post('/:id/members', authenticateUser, authorizeRoles('admin'), async (req, res) => {
  const { id: project_id } = req.params;
  const { user_id, role } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  const memberRole = role === 'admin' ? 'admin' : 'member';

  try {
    // Verify requesting user is admin of this project
    const adminCheck = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'`,
      [project_id, req.user.id]
    );
    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not an admin of this project' });
    }

    // Verify target user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await pool.query(
      `INSERT INTO project_members (user_id, project_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, project_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [user_id, project_id, memberRole]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add member error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /projects/:id/members
// ─────────────────────────────────────────────────────────────
router.get('/:id/members', authenticateUser, async (req, res) => {
  const { id: project_id } = req.params;
  try {
    // Ensure requesting user is a member
    const membership = await pool.query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [project_id, req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role AS global_role, pm.role AS project_role, pm.added_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.added_at ASC`,
      [project_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get members error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
