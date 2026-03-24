const state = {
  apiUrl: localStorage.getItem('apiUrl') || `${location.origin}/api`,
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  users: [],
  projects: [],
  members: [],
  tasks: [],
  selectedProjectId: null,
  selectedTaskId: null,
  taskPath: [],
};

const ids = [
  'apiUrl', 'registerName', 'authEmail', 'authPassword', 'registerBtn', 'loginBtn', 'logoutBtn', 'authStatusBadge',
  'projectName', 'projectDescription', 'projectDeadline', 'projectMembers', 'createProjectBtn', 'deleteProjectBtn', 'newProjectBtn',
  'memberUser', 'memberRole', 'addMemberBtn', 'updateMemberBtn', 'removeMemberBtn',
  'taskId', 'taskTitle', 'taskDescription', 'taskPriority', 'taskStatus', 'taskDueDate', 'taskParent', 'taskAssignees',
  'createTaskBtn', 'loadTaskBtn', 'deleteTaskBtn', 'newTaskBtn',
  'welcomeText', 'stats', 'projectList', 'memberList', 'taskList', 'selectedProjectMeta', 'authMessage', 'authError',
  'taskBreadcrumb', 'taskBreadcrumbBack'
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
el.apiUrl.value = state.apiUrl;

function notify(type, text = '') {
  el.authMessage.style.display = type === 'success' && text ? 'block' : 'none';
  el.authError.style.display = type === 'error' && text ? 'block' : 'none';
  el.authMessage.textContent = type === 'success' ? text : '';
  el.authError.textContent = type === 'error' ? text : '';
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
function flattenTasks(tasks = []) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks || [])]);
}
function currentTaskCollection() {
  if (!state.taskPath.length) return state.tasks;
  let nodes = state.tasks;
  for (const id of state.taskPath) {
    const task = (nodes || []).find((entry) => entry.id === id);
    if (!task) return state.tasks;
    nodes = task.subtasks || [];
  }
  return nodes || [];
}
function findTaskById(taskId, tasks = state.tasks) {
  for (const task of tasks || []) {
    if (task.id === taskId) return task;
    const nested = findTaskById(taskId, task.subtasks || []);
    if (nested) return nested;
  }
  return null;
}
function setAuthBadge() {
  el.authStatusBadge.textContent = state.user ? 'Online' : 'Offline';
  el.authStatusBadge.className = `badge ${state.user ? 'success' : 'neutral'}`;
}
function renderAuthState() {
  el.welcomeText.textContent = state.user
    ? `Angemeldet als ${state.user.name}. Verwalte Projekte, Mitglieder und verschachtelte Aufgaben.`
    : 'Bitte einloggen, um deine Projekte zu verwalten.';
  setAuthBadge();
}
function resetProjectForm() {
  el.projectName.value = '';
  el.projectDescription.value = '';
  el.projectDeadline.value = '';
  Array.from(el.projectMembers.options || []).forEach((option) => { option.selected = false; });
}
function resetTaskForm() {
  state.selectedTaskId = null;
  el.taskId.value = '';
  el.taskTitle.value = '';
  el.taskDescription.value = '';
  el.taskPriority.value = 'medium';
  el.taskStatus.value = 'todo';
  el.taskDueDate.value = '';
  el.taskParent.value = '';
  Array.from(el.taskAssignees.options || []).forEach((option) => { option.selected = false; });
}
function populateUserSelects() {
  const users = Array.isArray(state.users) ? state.users : [];
  const options = users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join('');
  el.projectMembers.innerHTML = options;
  el.memberUser.innerHTML = `<option value="">Bitte wählen</option>${options}`;

  const memberIds = new Set((state.members || []).map((member) => member.user?.id).filter(Boolean));
  const assigneeOptions = users
    .filter((user) => memberIds.size === 0 || memberIds.has(user.id))
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)
    .join('');
  el.taskAssignees.innerHTML = assigneeOptions;
}
function populateParentSelect() {
  const flat = flattenTasks(state.tasks).filter((task) => task.id !== el.taskId.value);
  el.taskParent.innerHTML = `<option value="">Kein Parent</option>${flat.map((task) => `<option value="${task.id}">${escapeHtml(task.title)}</option>`).join('')}`;
}
function updateStats() {
  const flat = flattenTasks(state.tasks);
  const doneCount = flat.filter((task) => task.status === 'done').length;
  el.stats.innerHTML = [
    ['Projekte', state.projects.length],
    ['Mitglieder', state.members.length],
    ['Tasks', flat.length],
    ['Erledigt', doneCount],
  ].map(([label, value]) => `<div class="stat-card"><span class="muted">${label}</span><strong>${value}</strong></div>`).join('');
}
function renderProjects() {
  if (!state.user) {
    el.projectList.innerHTML = '<p class="muted">Logge dich ein, um Projekte zu sehen.</p>';
    return;
  }
  if (!state.projects.length) {
    el.projectList.innerHTML = '<p class="muted">Noch keine Projekte vorhanden.</p>';
    return;
  }
  el.projectList.innerHTML = state.projects.map((project) => `
    <button class="list-item ${project.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${project.id}">
      <div>
        <strong>${escapeHtml(project.name)}</strong>
        <p class="muted">${escapeHtml(project.description || 'Keine Beschreibung')}</p>
      </div>
      <div class="meta-column">
        <span class="badge neutral">${escapeHtml(project.role)}</span>
        <span class="muted">${project.taskCount} Tasks</span>
      </div>
    </button>`).join('');
  el.projectList.querySelectorAll('[data-project-id]').forEach((button) => {
    button.onclick = async () => {
      state.selectedProjectId = button.dataset.projectId;
      state.taskPath = [];
      resetTaskForm();
      await loadProjectContext();
    };
  });
}
function renderMembers() {
  if (!state.selectedProjectId) {
    el.memberList.innerHTML = '<p class="muted">Wähle zuerst ein Projekt aus.</p>';
    return;
  }
  const members = Array.isArray(state.members) ? state.members : [];
  el.memberList.innerHTML = members.length
    ? members.map((member) => `
      <div class="list-item static">
        <div>
          <strong>${escapeHtml(member.user?.name || 'Unbekannt')}</strong>
          <p class="muted">${escapeHtml(member.user?.email || 'ohne E-Mail')}</p>
        </div>
        <div class="meta-column">
          <span class="badge neutral">${escapeHtml(member.role)}</span>
          <span class="muted">seit ${escapeHtml((member.joinedAt || '').slice(0, 10) || '-')}</span>
        </div>
      </div>`).join('')
    : '<p class="muted">Keine Mitglieder vorhanden.</p>';
}
function renderBreadcrumb() {
  const labels = ['Root', ...state.taskPath.map((taskId) => findTaskById(taskId)?.title || 'Task')];
  el.taskBreadcrumb.textContent = labels.join(' / ');
  el.taskBreadcrumbBack.disabled = state.taskPath.length === 0;
}
function taskCard(task, depth = 0) {
  const assignees = (task.assignees || []).length
    ? task.assignees.map((user) => `<span class="pill">${escapeHtml(user.name)}</span>`).join('')
    : '<span class="pill muted-pill">Nicht zugewiesen</span>';
  const childCount = (task.subtasks || []).length;
  return `
    <article class="task-card" data-priority="${escapeHtml(task.priority)}" style="--depth:${depth}">
      <div class="task-card-head">
        <div>
          <h4>${escapeHtml(task.title)}</h4>
          <p class="muted">${escapeHtml(task.description || 'Keine Beschreibung')}</p>
        </div>
        <div class="task-actions">
          <span class="badge neutral">${escapeHtml(task.status)}</span>
          <button class="ghost small" data-load-task="${task.id}">Bearbeiten</button>
          ${childCount ? `<button class="secondary small" data-open-children="${task.id}">Subtasks (${childCount})</button>` : ''}
        </div>
      </div>
      <div class="task-card-meta">
        <span>Deadline: ${escapeHtml(task.dueDate || 'offen')}</span>
        <span>Priorität: ${escapeHtml(task.priority)}</span>
        <span>Erstellt von: ${escapeHtml(task.createdBy?.name || 'Unbekannt')}</span>
      </div>
      <div>${assignees}</div>
    </article>`;
}
function renderTasks() {
  if (!state.selectedProjectId) {
    el.taskList.innerHTML = '<p class="muted">Wähle zuerst ein Projekt aus.</p>';
    renderBreadcrumb();
    return;
  }
  const tasks = currentTaskCollection();
  el.taskList.innerHTML = tasks.length ? tasks.map((task) => taskCard(task, state.taskPath.length)).join('') : '<p class="muted">Keine Tasks in dieser Ebene.</p>';
  el.taskList.querySelectorAll('[data-load-task]').forEach((button) => {
    button.onclick = () => loadTaskIntoForm(button.dataset.loadTask);
  });
  el.taskList.querySelectorAll('[data-open-children]').forEach((button) => {
    button.onclick = () => {
      state.taskPath.push(button.dataset.openChildren);
      renderTasks();
    };
  });
  renderBreadcrumb();
}
function hydrateProjectForm(project) {
  if (!project) {
    resetProjectForm();
    el.selectedProjectMeta.textContent = '';
    return;
  }
  el.projectName.value = project.name || '';
  el.projectDescription.value = project.description || '';
  el.projectDeadline.value = project.deadline ? String(project.deadline).slice(0, 10) : '';
  const memberIds = new Set((project.members || []).map((member) => member.user.id));
  Array.from(el.projectMembers.options || []).forEach((option) => {
    option.selected = memberIds.has(option.value) && option.value !== project.owner?.id;
  });
  el.selectedProjectMeta.textContent = `${project.owner?.name || 'Unbekannt'} · Deadline ${project.deadline ? String(project.deadline).slice(0, 10) : 'offen'}`;
}
async function loadUsers() {
  const response = await api('/users');
  state.users = Array.isArray(response?.users) ? response.users : [];
}
async function loadProjects() {
  const response = await api('/projects');
  state.projects = Array.isArray(response?.projects) ? response.projects : [];
  if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0]?.id || null;
  }
  renderProjects();
}
async function loadProjectContext() {
  if (!state.selectedProjectId) {
    state.members = [];
    state.tasks = [];
    hydrateProjectForm(null);
    populateUserSelects();
    populateParentSelect();
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
  const project = projectResponse?.project || null;
  state.members = Array.isArray(membersResponse?.members) ? membersResponse.members : [];
  state.tasks = Array.isArray(tasksResponse?.tasks) ? tasksResponse.tasks : [];
  populateUserSelects();
  populateParentSelect();
  hydrateProjectForm(project);
  renderProjects();
  renderMembers();
  renderTasks();
  updateStats();
}
async function bootstrap() {
  renderAuthState();
  renderProjects();
  renderMembers();
  renderTasks();
  updateStats();
  if (!state.token) return;
  try {
    await loadUsers();
    populateUserSelects();
    await loadProjects();
    await loadProjectContext();
  } catch (error) {
    logoutLocally();
    notify('error', error.message);
  }
}
async function register() {
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: el.registerName.value.trim(),
        email: el.authEmail.value.trim(),
        password: el.authPassword.value,
      }),
    });
    notify('success', 'Registrierung erfolgreich. Du kannst dich jetzt einloggen.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function login() {
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: el.authEmail.value.trim(), password: el.authPassword.value }),
    });
    state.token = data.token;
    state.user = data.user;
    persistAuth();
    notify('success', 'Login erfolgreich.');
    renderAuthState();
    await loadUsers();
    populateUserSelects();
    await loadProjects();
    await loadProjectContext();
  } catch (error) {
    notify('error', error.message);
  }
}
function logoutLocally() {
  state.token = '';
  state.user = null;
  state.users = [];
  state.projects = [];
  state.members = [];
  state.tasks = [];
  state.selectedProjectId = null;
  state.selectedTaskId = null;
  state.taskPath = [];
  persistAuth();
  resetProjectForm();
  resetTaskForm();
  populateUserSelects();
  populateParentSelect();
  renderAuthState();
  renderProjects();
  renderMembers();
  renderTasks();
  updateStats();
}
async function logout() {
  try { if (state.token) await api('/auth/logout', { method: 'POST' }); } catch (_) {}
  logoutLocally();
  notify('success', 'Abgemeldet.');
}
async function saveProject() {
  const payload = {
    name: el.projectName.value.trim(),
    description: el.projectDescription.value.trim(),
    deadline: el.projectDeadline.value || null,
  };
  try {
    if (state.selectedProjectId) {
      await api(`/projects/${state.selectedProjectId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      payload.members = Array.from(el.projectMembers.selectedOptions || []).map((option) => ({ userId: option.value, role: 'employee' }));
      const response = await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
      state.selectedProjectId = response?.project?.id || null;
    }
    await loadProjects();
    await loadProjectContext();
    notify('success', 'Projekt gespeichert.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function deleteProject() {
  if (!state.selectedProjectId) return notify('error', 'Bitte zuerst ein Projekt auswählen.');
  try {
    await api(`/projects/${state.selectedProjectId}`, { method: 'DELETE' });
    state.selectedProjectId = null;
    state.taskPath = [];
    resetProjectForm();
    resetTaskForm();
    await loadProjects();
    await loadProjectContext();
    notify('success', 'Projekt gelöscht.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function modifyMember(action) {
  if (!state.selectedProjectId) return notify('error', 'Bitte zuerst ein Projekt auswählen.');
  if (!el.memberUser.value) return notify('error', 'Bitte einen Benutzer auswählen.');
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
    notify('success', 'Mitglieder aktualisiert.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function loadTaskIntoForm(taskId = el.taskId.value.trim()) {
  if (!taskId) return notify('error', 'Bitte eine Task auswählen oder ID angeben.');
  try {
    const response = await api(`/tasks/${taskId}`);
    const task = response?.task;
    if (!task) throw new Error('Task nicht gefunden.');
    state.selectedTaskId = task.id;
    el.taskId.value = task.id;
    el.taskTitle.value = task.title || '';
    el.taskDescription.value = task.description || '';
    el.taskPriority.value = task.priority || 'medium';
    el.taskStatus.value = task.status || 'todo';
    el.taskDueDate.value = task.dueDate ? String(task.dueDate).slice(0, 10) : '';
    populateParentSelect();
    el.taskParent.value = task.parentTaskId || '';
    const assigneeIds = new Set((task.assignees || []).map((user) => user.id));
    Array.from(el.taskAssignees.options || []).forEach((option) => {
      option.selected = assigneeIds.has(option.value);
    });
    notify('success', 'Task geladen.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function saveTask() {
  if (!state.selectedProjectId) return notify('error', 'Bitte zuerst ein Projekt auswählen.');
  const payload = {
    title: el.taskTitle.value.trim(),
    description: el.taskDescription.value.trim(),
    priority: el.taskPriority.value,
    status: el.taskStatus.value,
    dueDate: el.taskDueDate.value || null,
    parentTaskId: el.taskParent.value || null,
    assigneeIds: Array.from(el.taskAssignees.selectedOptions || []).map((option) => option.value),
  };
  try {
    if (el.taskId.value) {
      await api(`/tasks/${el.taskId.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api(`/projects/${state.selectedProjectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
    }
    resetTaskForm();
    await loadProjectContext();
    notify('success', 'Task gespeichert.');
  } catch (error) {
    notify('error', error.message);
  }
}
async function deleteTask() {
  if (!el.taskId.value) return notify('error', 'Bitte zuerst eine Task laden.');
  try {
    await api(`/tasks/${el.taskId.value}`, { method: 'DELETE' });
    resetTaskForm();
    await loadProjectContext();
    notify('success', 'Task gelöscht.');
  } catch (error) {
    notify('error', error.message);
  }
}

el.registerBtn.onclick = register;
el.loginBtn.onclick = login;
el.logoutBtn.onclick = logout;
el.newProjectBtn.onclick = () => { state.selectedProjectId = null; resetProjectForm(); renderProjects(); renderMembers(); renderTasks(); };
el.createProjectBtn.onclick = saveProject;
el.deleteProjectBtn.onclick = deleteProject;
el.addMemberBtn.onclick = () => modifyMember('add');
el.updateMemberBtn.onclick = () => modifyMember('update');
el.removeMemberBtn.onclick = () => modifyMember('remove');
el.newTaskBtn.onclick = resetTaskForm;
el.createTaskBtn.onclick = saveTask;
el.loadTaskBtn.onclick = () => loadTaskIntoForm();
el.deleteTaskBtn.onclick = deleteTask;
el.taskBreadcrumbBack.onclick = () => {
  state.taskPath.pop();
  renderTasks();
};

bootstrap();