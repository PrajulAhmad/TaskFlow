-- ============================================================
-- FULL-STACK TEAM TASK MANAGER — DATABASE SCHEMA (Phase A)
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID generation (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (char_length(name) >= 2),
  email       TEXT        NOT NULL UNIQUE
                          CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  password    TEXT        NOT NULL CHECK (char_length(password) >= 6),
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (char_length(name) >= 3),
  description  TEXT,
  created_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PROJECT MEMBERS (team management)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)          -- prevent duplicate membership
);

-- ─────────────────────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (char_length(title) >= 3),
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'todo'
                           CHECK (status IN ('todo', 'in-progress', 'done')),
  assigned_to  UUID        REFERENCES users(id) ON DELETE SET NULL,
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to  ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pm_project_id      ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user_id         ON project_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- VERIFICATION INSERTS (test data — remove in production)
-- ─────────────────────────────────────────────────────────────
-- Insert admin user (password = 'admin123' — raw; backend hashes in practice)
INSERT INTO users (name, email, password, role)
VALUES ('Alice Admin', 'alice@example.com', 'admin123', 'admin')
ON CONFLICT DO NOTHING;

-- Insert member user
INSERT INTO users (name, email, password, role)
VALUES ('Bob Member', 'bob@example.com', 'member123', 'member')
ON CONFLICT DO NOTHING;

-- Create a project
INSERT INTO projects (name, description, created_by)
SELECT 'Alpha Project', 'Our first project', id FROM users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- Add both users to the project
INSERT INTO project_members (user_id, project_id, role)
SELECT u.id, p.id, 'admin'
FROM users u, projects p
WHERE u.email = 'alice@example.com' AND p.name = 'Alpha Project'
ON CONFLICT DO NOTHING;

INSERT INTO project_members (user_id, project_id, role)
SELECT u.id, p.id, 'member'
FROM users u, projects p
WHERE u.email = 'bob@example.com' AND p.name = 'Alpha Project'
ON CONFLICT DO NOTHING;

-- Create a task
INSERT INTO tasks (title, description, status, assigned_to, project_id, due_date)
SELECT 'Setup project repository', 'Init GitHub repo and CI/CD', 'todo', u.id, p.id,
       NOW() + INTERVAL '7 days'
FROM users u, projects p
WHERE u.email = 'bob@example.com' AND p.name = 'Alpha Project'
ON CONFLICT DO NOTHING;
