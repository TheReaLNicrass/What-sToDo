const state = {
  apiUrl: localStorage.getItem('apiUrl') || `${location.origin}/api`,
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  users: [],
  projects: [],
  members: [],
  tasks: [],
  selectedProjectId: null,
};

const ids = [
  'apiUrl','registerName','authEmail','authPassword','registerBtn','loginBtn','logoutBtn','projectName','projectDescription','projectDeadline',
  'projectMembers','createProjectBtn','updateProjectBtn','deleteProjectBtn','memberUser','memberRole','addMemberBtn','updateMemberBtn','removeMemberBtn',
  'taskId','taskTitle','taskDescription','taskPriority','taskStatus','taskDueDate','taskParent','taskAssignees','createTaskBtn','loadTaskBtn','deleteTaskBtn',
  'welcomeText','stats','projectList','memberList','taskList','selectedProjectMeta','authMessage','authError'
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
el.apiUrl.value = state.apiUrl;

function showMessage(target, text) {
  target.textContent = text;
  target.style.display = text ? 'block' : 'none';
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
async function api(path, options = {}) {
  state.apiUrl = el.apiUrl.value.trim().replace(/\/$/, '');
  localStorage.setItem('apiUrl', state.apiUrl);
  const response = await fetch(`${state.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'API-Fehler');
  return data;
}
function persistAuth() {
  localStorage.setItem('token', state.token);
  localStorage.setItem('user', JSON.stringify(state.user));
}
function flattenTasks(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks || [])]);
}
function resetTaskForm() {
  ['taskId', 'taskTitle', 'taskDescription', 'taskDueDate'].forEach((key) => { el[key].value = ''; });
  el.taskPriority.value = 'medium';
  el.taskStatus.value = 'todo';
  el.taskParent.value = '';
  [...el.taskAssignees.options].forEach((option) => { option.selected = false; });
}
function populateUserSelects() {
  const allUsers = state.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join('');
  el.projectMembers.innerHTML = allUsers;
  el.memberUser.innerHTML = `<option value="">Bitte wählen</option>${allUsers}`;
  const projectUserIds = new Set(state.members.map((member) => member.user.id));
  el.taskAssignees.innerHTML = state.users
    .filter((user) => projectUserIds.size === 0 || projectUserIds.has(user.id))
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)
    .join('');
}
function populateParentSelect() {
  const options = flattenTasks(state.tasks)
    .map((task) => `<option value="${task.id}">${escapeHtml(task.title)}</option>`)
    .join('');
  el.taskParent.innerHTML = `<option value="">Kein Parent</option>${options}`;
}
function updateStats() {
  const flatTasks = flattenTasks(state.tasks);
  el.stats.innerHTML = [
    ['Projekte', state.projects.length],
    ['Mitglieder', state.members.length],
    ['Tasks', flatTasks.length],
    ['Offen', flatTasks.filter((task) => task.status !== 'done').length],
  ].map(([label, value]) => `<div class="stat"><span class="muted">${label}</span><strong>${value}</strong></div>`).join('');
}
function renderAuthState() {
  el.welcomeText.textContent = state.user ? `Angemeldet als ${state.user.name} (${state.user.email}).` : 'Bitte einloggen, um Projekte und Tasks zu laden.';
}
function renderProjects() {
  if (!state.projects.length) {
    el.projectList.innerHTML = '<p class="muted">Keine Projekte vorhanden.</p>';
    return;
  }
  el.projectList.innerHTML = state.projects.map((project) => `
    <button class="secondary ${project.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${project.id}">
      <strong>${escapeHtml(project.name)}</strong><br />
      <span class="muted">Owner: ${escapeHtml(project.owner?.name || 'Unbekannt')} · Rolle: ${escapeHtml(project.role)} · Tasks: ${project.taskCount} · Deadline: ${escapeHtml(project.deadline || 'offen')}</span>
    </button>`).join('');
  [...el.projectList.querySelectorAll('[data-project-id]')].forEach((button) => {
    button.onclick = async () => {
      state.selectedProjectId = button.dataset.projectId;
      await loadProjectContext();
    };
  });
}
function renderMembers() {
  if (!state.selectedProjectId) {
    el.memberList.innerHTML = '<p class="muted">Bitte zuerst ein Projekt auswählen.</p>';
    return;
  }
  el.memberList.innerHTML = state.members.map((member) => `<div class="list-row"><div><strong>${escapeHtml(member.user.name)}</strong><div class="muted">${escapeHtml(member.user.email)} · seit ${escapeHtml((member.joinedAt || '').slice(0, 10))}</div></div><span class="pill">${escapeHtml(member.role)}</span></div>`).join('') || '<p class="muted">Keine Mitglieder vorhanden.</p>';
}
function renderTask(task) {
  const assignees = task.assignees.length ? task.assignees.map((user) => `<span class="pill">${escapeHtml(user.name)}</span>`).join('') : '<span class="pill">Nicht zugewiesen</span>';
  const subtasks = task.subtasks?.length ? `<div class="children">${task.subtasks.map(renderTask).join('')}</div>` : '';
  return `<div class="task" data-priority="${escapeHtml(task.priority)}">
    <div class="row between"><strong>${escapeHtml(task.title)}</strong><div class="row"><span class="pill">${escapeHtml(task.status)}</span><button class="secondary mini" data-load-task="${task.id}">Laden</button></div></div>
    <p>${escapeHtml(task.description || 'Keine Beschreibung')}</p>
    <div class="muted">Erstellt von ${escapeHtml(task.createdBy?.name || 'Unbekannt')} · Fällig: ${escapeHtml(task.dueDate || 'offen')}</div>
    <div>${assignees}</div>
    ${subtasks}
  </div>`;
}
function renderTasks() {
  if (!state.selectedProjectId) {
    el.taskList.innerHTML = '<p class="muted">Bitte zuerst ein Projekt auswählen.</p>';
    return;
  }
  el.taskList.innerHTML = state.tasks.length ? state.tasks.map(renderTask).join('') : '<p class="muted">Keine Tasks vorhanden.</p>';
  [...el.taskList.querySelectorAll('[data-load-task]')].forEach((button) => {
    button.onclick = () => loadTaskIntoForm(button.dataset.loadTask);
  });
}
function hydrateProjectForm(project) {
  el.projectName.value = project?.name || '';
  el.projectDescription.value = project?.description || '';
  el.projectDeadline.value = project?.deadline || '';
  [...el.projectMembers.options].forEach((option) => {
    option.selected = false;
  });
}
async function loadUsers() {
  const { users } = await api('/users');
  state.users = users;
}
async function loadProjects() {
  const { projects } = await api('/projects');
  state.projects = projects;
  if (!state.selectedProjectId || !projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = projects[0]?.id || null;
  }
  renderProjects();
}
async function loadProjectContext() {
  if (!state.selectedProjectId) {
    state.members = [];
    state.tasks = [];
    renderMembers();
    renderTasks();
    updateStats();
    return;
  }
  const [projectResponse, membersResponse, tasksResponse] = await Promise.all([
    api(`/projects/${state.selectedProjectId}`),
    api(`/projects/${state.selectedProjectId}/members`),
    api(`/projects/${state.selectedProjectId}/tasks`),
  ]);
  const project = projectResponse.project;
  state.members = membersResponse.members;
  state.tasks = tasksResponse.tasks;
  el.selectedProjectMeta.textContent = `${project.name} · Owner: ${project.owner?.name || 'Unbekannt'} · Rolle: ${project.role}`;
  hydrateProjectForm(project);
  populateUserSelects();
  populateParentSelect();
  renderProjects();
  renderMembers();
  renderTasks();
  updateStats();
}
async function bootstrap() {
  renderAuthState();
  if (!state.token) {
    renderProjects();
    renderMembers();
    renderTasks();
    return;
  }
  try {
    await loadUsers();
    await loadProjects();
    populateUserSelects();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function register() {
  try {
    await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: el.registerName.value.trim(), email: el.authEmail.value.trim(), password: el.authPassword.value }) });
    showMessage(el.authMessage, 'Registrierung erfolgreich.');
    showMessage(el.authError, '');
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function login() {
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: el.authEmail.value.trim(), password: el.authPassword.value }) });
    state.token = data.token;
    state.user = data.user;
    persistAuth();
    renderAuthState();
    showMessage(el.authMessage, 'Login erfolgreich.');
    showMessage(el.authError, '');
    await loadUsers();
    await loadProjects();
    populateUserSelects();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  state.token = '';
  state.user = null;
  state.projects = [];
  state.members = [];
  state.tasks = [];
  persistAuth();
  renderAuthState();
  renderProjects();
  renderMembers();
  renderTasks();
  updateStats();
}
async function saveProject() {
  const payload = { name: el.projectName.value.trim(), description: el.projectDescription.value.trim(), deadline: el.projectDeadline.value || null };
  try {
    if (state.selectedProjectId) {
      await api(`/projects/${state.selectedProjectId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      payload.members = [...el.projectMembers.selectedOptions].map((option) => ({ userId: option.value, role: 'employee' }));
      const { project } = await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
      state.selectedProjectId = project.id;
    }
    await loadProjects();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function deleteProject() {
  if (!state.selectedProjectId) return;
  try {
    await api(`/projects/${state.selectedProjectId}`, { method: 'DELETE' });
    state.selectedProjectId = null;
    hydrateProjectForm(null);
    await loadProjects();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function modifyMember(action) {
  if (!state.selectedProjectId || !el.memberUser.value) return;
  try {
    if (action === 'add') {
      await api(`/projects/${state.selectedProjectId}/members`, { method: 'POST', body: JSON.stringify({ userId: el.memberUser.value, role: el.memberRole.value }) });
    } else if (action === 'update') {
      await api(`/projects/${state.selectedProjectId}/members/${el.memberUser.value}`, { method: 'PUT', body: JSON.stringify({ role: el.memberRole.value }) });
    } else {
      await api(`/projects/${state.selectedProjectId}/members/${el.memberUser.value}`, { method: 'DELETE' });
    }
    await loadProjects();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function loadTaskIntoForm(taskId = el.taskId.value.trim()) {
  if (!taskId) return;
  try {
    const { task } = await api(`/tasks/${taskId}`);
    el.taskId.value = task.id;
    el.taskTitle.value = task.title;
    el.taskDescription.value = task.description || '';
    el.taskPriority.value = task.priority;
    el.taskStatus.value = task.status;
    el.taskDueDate.value = task.dueDate || '';
    el.taskParent.value = task.parentTaskId || '';
    [...el.taskAssignees.options].forEach((option) => { option.selected = task.assignees.some((user) => user.id === option.value); });
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function saveTask() {
  if (!state.selectedProjectId) return;
  const assigneeIds = [...el.taskAssignees.selectedOptions].map((option) => option.value);
  const payload = {
    title: el.taskTitle.value.trim(),
    description: el.taskDescription.value.trim(),
    priority: el.taskPriority.value,
    status: el.taskStatus.value,
    dueDate: el.taskDueDate.value || null,
    parentTaskId: el.taskParent.value || null,
    assigneeIds,
  };
  try {
    if (el.taskId.value.trim()) {
      await api(`/tasks/${el.taskId.value.trim()}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api(`/projects/${state.selectedProjectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
    }
    resetTaskForm();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function deleteTask() {
  const taskId = el.taskId.value.trim();
  if (!taskId) return;
  try {
    await api(`/tasks/${taskId}`, { method: 'DELETE' });
    resetTaskForm();
    await loadProjectContext();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}

el.registerBtn.onclick = register;
el.loginBtn.onclick = login;
el.logoutBtn.onclick = logout;
el.createProjectBtn.onclick = saveProject;
el.updateProjectBtn.onclick = saveProject;
el.deleteProjectBtn.onclick = deleteProject;
el.addMemberBtn.onclick = () => modifyMember('add');
el.updateMemberBtn.onclick = () => modifyMember('update');
el.removeMemberBtn.onclick = () => modifyMember('remove');
el.createTaskBtn.onclick = saveTask;
el.loadTaskBtn.onclick = () => loadTaskIntoForm();
el.deleteTaskBtn.onclick = deleteTask;

bootstrap();