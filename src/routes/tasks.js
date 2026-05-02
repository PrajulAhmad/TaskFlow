const express = require('express');
const pool = require('../db');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['todo', 'in-progress', 'done'];

// ─────────────────────────────────────────────────────────────
// Helper: check if user is member of a project
// ─────────────────────────────────────────────────────────────
async function isMember(user_id, project_id) {
  const res = await pool.query(
    'SELECT role FROM project_members WHERE user_id = $1 AND project_id = $2',
    [user_id, project_id]
  );
  return res.rows[0] || null; // returns { role } or null
}

// ─────────────────────────────────────────────────────────────
// POST /tasks
// ─────────────────────────────────────────────────────────────
router.post('/', authenticateUser, async (req, res) => {
  const { title, description, status, assigned_to, project_id, due_date } = req.body;

  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: 'Task title must be at least 3 characters' });
  }
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    // Check requesting user is a member of the project
    const membership = await isMember(req.user.id, project_id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    // If assigning to someone, ensure they are also a project member
    if (assigned_to) {
      const assigneeMembership = await isMember(assigned_to, project_id);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project' });
      }
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, assigned_to, project_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        status || 'todo',
        assigned_to || null,
        project_id,
        due_date || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create task error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /tasks  (only tasks from user's projects, optional ?project_id=)
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateUser, async (req, res) => {
  const { project_id } = req.query;

  try {
    let query, params;

    if (project_id) {
      // Ensure user is a member of the specified project
      const membership = await isMember(req.user.id, project_id);
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this project' });
      }
      query = `
        SELECT t.*, u.name AS assigned_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.project_id = $1
        ORDER BY t.created_at DESC`;
      params = [project_id];
    } else {
      // All tasks from all projects the user belongs to
      query = `
        SELECT t.*, u.name AS assigned_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        WHERE t.project_id IN (
          SELECT project_id FROM project_members WHERE user_id = $1
        )
        ORDER BY t.created_at DESC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get tasks error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /tasks/:id
// ─────────────────────────────────────────────────────────────
router.patch('/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, assigned_to, due_date } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (title !== undefined && title.trim().length < 3) {
    return res.status(400).json({ error: 'Task title must be at least 3 characters' });
  }

  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = taskRes.rows[0];

    // Ensure user is a member of the project
    const membership = await isMember(req.user.id, task.project_id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    // Members can only update tasks assigned to them; admins can update any
    if (membership.role === 'member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Members can only update their own assigned tasks' });
    }

    // Validate new assignee is a project member
    if (assigned_to && assigned_to !== task.assigned_to) {
      const assigneeMembership = await isMember(assigned_to, task.project_id);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project' });
      }
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status),
           assigned_to = COALESCE($4, assigned_to),
           due_date    = COALESCE($5, due_date)
       WHERE id = $6
       RETURNING *`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        status || null,
        assigned_to || null,
        due_date || null,
        id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update task error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /tasks/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = taskRes.rows[0];

    const membership = await isMember(req.user.id, task.project_id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    // Members can only delete tasks assigned to them; admins can delete any
    if (membership.role === 'member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Members can only delete their own assigned tasks' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
