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

-- Insert members into projects (Alice -> Alpha, Bob -> Alpha, Charlie -> Beta)
INSERT INTO project_members (project_id, user_id, role)
SELECT id, (SELECT id FROM users WHERE email='alice@example.com'), 'admin'
FROM projects WHERE name='Alpha Project'
ON CONFLICT DO NOTHING;

INSERT INTO project_members (project_id, user_id, role)
SELECT id, (SELECT id FROM users WHERE email='bob@example.com'), 'member'
FROM projects WHERE name='Alpha Project'
ON CONFLICT DO NOTHING;

INSERT INTO project_members (project_id, user_id, role)
SELECT id, (SELECT id FROM users WHERE email='charlie@example.com'), 'admin'
FROM projects WHERE name='Beta Project'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Activity Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- Task Comments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- Refresh Tokens
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create a task
INSERT INTO tasks (title, description, status, assigned_to, project_id, due_date)
SELECT 'Setup project repository', 'Init GitHub repo and CI/CD', 'todo', u.id, p.id,
       NOW() + INTERVAL '7 days'
FROM users u, projects p
WHERE u.email = 'bob@example.com' AND p.name = 'Alpha Project'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Activity Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- Task Comments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- Refresh Tokens
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
