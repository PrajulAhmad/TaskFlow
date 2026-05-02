const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

async function logActivity(projectId, userId, action, details = '') {
  try {
    await pool.query(
      'INSERT INTO activity_logs (project_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [projectId, userId, action, details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  logActivity
};
