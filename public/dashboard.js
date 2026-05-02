/* ================================================================
   dashboard.js — Dashboard page logic
   ================================================================ */

// ── Auth guard ────────────────────────────────────────────────
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || 'null');
if (!token || !user) window.location.href = '/index.html';

// ── Populate sidebar ──────────────────────────────────────────
document.getElementById('sidebar-username').textContent = user.name;
document.getElementById('sidebar-role').textContent     = user.role;
document.getElementById('user-avatar').textContent      = user.name[0].toUpperCase();
document.getElementById('my-user-id').textContent       = user.id;

// Show/hide admin-only UI
if (user.role !== 'admin') {
  const createProjBtn = document.getElementById('create-project-btn');
  if (createProjBtn) createProjBtn.classList.add('hidden');
}

// ── Section navigation ────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');

  if (name === 'overview') loadOverview();
  if (name === 'projects') loadProjects();
  if (name === 'tasks')    { populateProjectFilters(); loadTasks(); }
  if (name === 'team')     populateTeamProjectDropdown();
}

// ── Logout ────────────────────────────────────────────────────
function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}

// ── Error helpers ─────────────────────────────────────────────
function showErr(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function closeModalOnOverlay(e, id) { if (e.target.id === id) closeModal(id); }

// ══════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════
async function loadOverview() {
  try {
    const [projects, tasks] = await Promise.all([getProjects(), getTasks()]);

    const now  = new Date();
    const done = tasks.filter(t => t.status === 'done');
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done');

    document.getElementById('stat-total-val').textContent    = tasks.length;
    document.getElementById('stat-done-val').textContent     = done.length;
    document.getElementById('stat-overdue-val').textContent  = overdue.length;
    document.getElementById('stat-projects-val').textContent = projects.length;

    // Recent tasks (last 5)
    const list = document.getElementById('recent-tasks-list');
    if (tasks.length === 0) {
      list.innerHTML = '<p class="empty-state">No tasks yet. Create one in the Tasks tab.</p>';
      return;
    }
    list.innerHTML = tasks.slice(0, 5).map(t => `
      <div class="task-list-item">
        <span style="font-size:0.88rem;font-weight:600">${esc(t.title)}</span>
        <span class="task-status-pill pill-${statusClass(t.status)}">${t.status}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// ══════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const projects = await getProjects();
    if (projects.length === 0) {
      grid.innerHTML = '<p class="empty-state">No projects yet.' + (user.role === 'admin' ? ' Create one!' : '') + '</p>';
      return;
    }
    grid.innerHTML = projects.map(p => `
      <div class="project-card" onclick="goToProjectTasks('${p.id}')">
        <div class="project-card-name">${esc(p.name)}</div>
        <div class="project-card-desc">${esc(p.description || 'No description')}</div>
        <div class="project-card-meta">
          <span class="project-card-role">${p.member_role}</span>
          ${user.role === 'admin' ? `<button class="project-card-delete" onclick="event.stopPropagation();confirmDeleteProject('${p.id}','${esc(p.name)}')">Delete</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showErr('projects-error', err.message);
    grid.innerHTML = '';
  }
}

function goToProjectTasks(projectId) {
  showSection('tasks');
  const filter = document.getElementById('task-project-filter');
  if (filter) filter.value = projectId;
  loadTasks();
}

document.getElementById('create-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('proj-name').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  if (!name || name.length < 3) return showErr('create-project-error', 'Name must be at least 3 chars');
  try {
    await createProject(name, desc);
    closeModal('modal-create-project');
    document.getElementById('create-project-form').reset();
    loadProjects();
  } catch (err) {
    showErr('create-project-error', err.message);
  }
});

async function confirmDeleteProject(id, name) {
  if (!confirm(`Delete project "${name}"? This will also delete all its tasks.`)) return;
  try {
    await deleteProject(id);
    loadProjects();
  } catch (err) {
    showErr('projects-error', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════
async function populateProjectFilters() {
  try {
    const projects = await getProjects();
    const taskFilter = document.getElementById('task-project-filter');
    const taskProject = document.getElementById('task-project');

    // Task filter dropdown
    const oldVal = taskFilter.value;
    taskFilter.innerHTML = '<option value="">All Projects</option>';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      taskFilter.appendChild(opt);
    });
    if (oldVal) taskFilter.value = oldVal;

    // Task creation project dropdown
    if (taskProject) {
      taskProject.innerHTML = '';
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.name;
        taskProject.appendChild(opt);
      });
      if (projects.length > 0) {
        taskProject.dispatchEvent(new Event('change'));
      }
    }
  } catch (err) { /* ignore */ }
}

async function loadTasks() {
  const projectId = document.getElementById('task-project-filter').value;
  const cols = { todo: [], 'in-progress': [], done: [] };

  try {
    const tasks = await getTasks(projectId || undefined);
    tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

    renderColumn('col-todo',     cols['todo'],        'count-todo');
    renderColumn('col-progress', cols['in-progress'], 'count-progress');
    renderColumn('col-done',     cols['done'],        'count-done');
  } catch (err) {
    showErr('tasks-error', err.message);
  }
}

function renderColumn(colId, tasks, countId) {
  document.getElementById(countId).textContent = tasks.length;
  const col = document.getElementById(colId);
  if (tasks.length === 0) {
    col.innerHTML = '<p class="empty-state" style="font-size:0.8rem">Empty</p>';
    return;
  }
  col.innerHTML = tasks.map(t => {
    const now = new Date();
    const due = t.due_date ? new Date(t.due_date) : null;
    let dueClass = '';
    let dueLabel = '';
    if (due) {
      const diffDays = (due - now) / 86400000;
      if (due < now && t.status !== 'done') { dueClass = 'due-overdue'; dueLabel = `⚠️ Overdue: ${fmtDate(due)}`; }
      else if (diffDays < 2)                { dueClass = 'due-soon';    dueLabel = `⏰ Due: ${fmtDate(due)}`; }
      else                                  { dueClass = 'due-ok';      dueLabel = `📅 ${fmtDate(due)}`; }
    }
    return `
      <div class="task-card" onclick="openEditTask(${JSON.stringify(t).replace(/"/g, '&quot;')})">
        <div class="task-card-title">${esc(t.title)}</div>
        ${t.assigned_name ? `<div class="task-card-assigned">👤 ${esc(t.assigned_name)}</div>` : ''}
        ${dueLabel ? `<div class="task-card-due ${dueClass}">${dueLabel}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Create task form
document.getElementById('create-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title      = document.getElementById('task-title').value.trim();
  const desc       = document.getElementById('task-desc').value.trim();
  const project_id = document.getElementById('task-project').value;
  const assigned   = document.getElementById('task-assigned').value.trim();
  const due        = document.getElementById('task-due').value;

  if (!title || title.length < 3) return showErr('create-task-error', 'Title must be at least 3 chars');
  if (!project_id)                 return showErr('create-task-error', 'Select a project');

  try {
    await createTask({
      title, description: desc || undefined,
      project_id,
      assigned_to: assigned || undefined,
      due_date: due ? new Date(due).toISOString() : undefined,
    });
    closeModal('modal-create-task');
    document.getElementById('create-task-form').reset();
    loadTasks();
  } catch (err) {
    showErr('create-task-error', err.message);
  }
});

// Edit task modal
function openEditTask(task) {
  document.getElementById('edit-task-id').value    = task.id;
  document.getElementById('edit-task-title').value = task.title;
  document.getElementById('edit-task-desc').value  = task.description || '';
  document.getElementById('edit-task-status').value = task.status;
  if (task.due_date) {
    // Format for datetime-local input
    const d = new Date(task.due_date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('edit-task-due').value = local;
  } else {
    document.getElementById('edit-task-due').value = '';
  }
  openModal('modal-edit-task');
}

document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id     = document.getElementById('edit-task-id').value;
  const title  = document.getElementById('edit-task-title').value.trim();
  const desc   = document.getElementById('edit-task-desc').value.trim();
  const status = document.getElementById('edit-task-status').value;
  const due    = document.getElementById('edit-task-due').value;

  if (!title || title.length < 3) return showErr('edit-task-error', 'Title must be at least 3 chars');

  try {
    await updateTask(id, {
      title,
      description: desc || undefined,
      status,
      due_date: due ? new Date(due).toISOString() : undefined,
    });
    closeModal('modal-edit-task');
    loadTasks();
  } catch (err) {
    showErr('edit-task-error', err.message);
  }
});

document.getElementById('delete-task-btn').addEventListener('click', async () => {
  const id = document.getElementById('edit-task-id').value;
  if (!confirm('Delete this task?')) return;
  try {
    await deleteTask(id);
    closeModal('modal-edit-task');
    loadTasks();
  } catch (err) {
    showErr('edit-task-error', err.message);
  }
});

// ══════════════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════════════
async function populateTeamProjectDropdown() {
  const sel = document.getElementById('team-project-filter');
  try {
    const projects = await getProjects();
    sel.innerHTML = '<option value="">Select a Project</option>';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      sel.appendChild(opt);
    });
  } catch (err) { /* ignore */ }
}

async function loadMembers() {
  const projectId = document.getElementById('team-project-filter').value;
  const panel    = document.getElementById('team-panel');
  const addPanel = document.getElementById('add-member-panel');

  if (!projectId) {
    panel.innerHTML = '<p class="empty-state">Select a project to view team members.</p>';
    addPanel.classList.add('hidden');
    return;
  }

  try {
    const members = await getMembers(projectId);

    panel.innerHTML = members.map(m => `
      <div class="member-card">
        <div class="member-avatar">${m.name[0].toUpperCase()}</div>
        <div class="member-info">
          <div class="member-name">${esc(m.name)}</div>
          <div class="member-email">${esc(m.email)}</div>
        </div>
        <span class="member-role-badge role-${m.project_role}">${m.project_role}</span>
      </div>
    `).join('') || '<p class="empty-state">No members found.</p>';

    // Show add member panel for project admins
    const myMembership = members.find(m => m.id === user.id);
    if (myMembership && myMembership.project_role === 'admin') {
      addPanel.classList.remove('hidden');
    } else if (user.role === 'admin') {
      addPanel.classList.remove('hidden');
    } else {
      addPanel.classList.add('hidden');
    }
  } catch (err) {
    showErr('team-error', err.message);
  }
}

async function addMember() {
  const projectId = document.getElementById('team-project-filter').value;
  const user_id   = document.getElementById('member-user-id').value.trim();
  const role      = document.getElementById('member-role').value;

  if (!projectId) return showErr('team-error', 'Select a project first');
  if (!user_id)   return showErr('team-error', 'Enter a user ID');

  try {
    await addProjectMember(projectId, user_id, role);
    document.getElementById('member-user-id').value = '';
    loadMembers();
  } catch (err) {
    showErr('team-error', err.message);
  }
}

// ── Dynamic Dropdowns ─────────────────────────────────────────
async function populateAllUsers() {
  if (user.role !== 'admin') return;
  const sel = document.getElementById('member-user-id');
  if (!sel) return;
  try {
    const users = await getAllUsers();
    sel.innerHTML = '<option value="">Select a user...</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = `${u.name} (${u.email})`;
      sel.appendChild(opt);
    });
  } catch(err) { console.error(err); }
}

document.getElementById('task-project').addEventListener('change', async (e) => {
  const projectId = e.target.value;
  const sel = document.getElementById('task-assigned');
  sel.innerHTML = '<option value="">Unassigned</option>';
  if (!projectId) return;
  try {
    const members = await getMembers(projectId);
    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.name;
      sel.appendChild(opt);
    });
  } catch (err) { console.error(err); }
});

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function statusClass(status) {
  if (status === 'in-progress') return 'progress';
  if (status === 'done')        return 'done';
  return 'todo';
}

// ── Initial load ──────────────────────────────────────────────
loadOverview();
populateProjectFilters();
populateAllUsers();
