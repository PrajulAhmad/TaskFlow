/* ================================================================
   api.js — Shared API helper (auto-attaches JWT)
   ================================================================ */

const BASE_URL = window.location.origin; // same origin (Express serves static)

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────
async function login(email, password) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}

async function signup(name, email, password, role) {
  return apiFetch('/auth/signup', { method: 'POST', body: { name, email, password, role } });
}

// ── Projects ──────────────────────────────────────────────────
async function getProjects() {
  return apiFetch('/projects');
}

async function createProject(name, description) {
  return apiFetch('/projects', { method: 'POST', body: { name, description } });
}

async function deleteProject(id) {
  return apiFetch(`/projects/${id}`, { method: 'DELETE' });
}

// ── Project Members ───────────────────────────────────────────
async function getMembers(projectId) {
  return apiFetch(`/projects/${projectId}/members`);
}

async function addProjectMember(projectId, user_id, role) {
  return apiFetch(`/projects/${projectId}/members`, {
    method: 'POST',
    body: { user_id, role },
  });
}

// ── Tasks ─────────────────────────────────────────────────────
async function getTasks(projectId) {
  const qs = projectId ? `?project_id=${projectId}` : '';
  return apiFetch(`/tasks${qs}`);
}

async function createTask({ title, description, status, assigned_to, project_id, due_date }) {
  return apiFetch('/tasks', {
    method: 'POST',
    body: { title, description, status, assigned_to, project_id, due_date },
  });
}

async function updateTask(id, fields) {
  return apiFetch(`/tasks/${id}`, { method: 'PATCH', body: fields });
}

async function deleteTask(id) {
  return apiFetch(`/tasks/${id}`, { method: 'DELETE' });
}

// ── Users ─────────────────────────────────────────────────────
async function getAllUsers() {
  return apiFetch('/users');
}
