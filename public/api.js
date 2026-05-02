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

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body === 'object' && !(options.body instanceof FormData) 
      ? JSON.stringify(options.body) 
      : options.body,
  });

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh' && !options._retry) {
    options._retry = true;
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('token', data.token);
          headers['Authorization'] = `Bearer ${data.token}`;
          res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
            body: options.body && typeof options.body === 'object' && !(options.body instanceof FormData) 
              ? JSON.stringify(options.body) 
              : options.body,
          });
        } else {
          localStorage.clear();
          window.location.href = '/index.html';
        }
      } catch (err) {
        localStorage.clear();
        window.location.href = '/index.html';
      }
    } else {
      localStorage.clear();
      window.location.href = '/index.html';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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

async function updateProfile(name, password) {
  return apiFetch('/users/me', { method: 'PUT', body: JSON.stringify({ name, password }) });
}

// ── Activity & Comments ───────────────────────────────────────
async function getGlobalActivity() {
  return apiFetch('/projects/activity/all');
}

async function getTaskComments(taskId) {
  return apiFetch(`/tasks/${taskId}/comments`);
}

async function addTaskComment(taskId, comment) {
  return apiFetch(`/tasks/${taskId}/comments`, { method: 'POST', body: { comment } });
}

// ── Admin: User Management ─────────────────────────────────────
async function getUserStats() {
  return apiFetch('/users/stats');
}

async function changeUserRole(userId, role) {
  return apiFetch(`/users/${userId}/role`, { method: 'PATCH', body: { role } });
}
