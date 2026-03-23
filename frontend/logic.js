const state = {
  apiUrl: localStorage.getItem("apiUrl") || "http://localhost:3000/api",
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  users: [],
  projects: [],
  selectedProjectId: null,
  tasks: [],
};
const el = Object.fromEntries(
  [
    "apiUrl",
    "registerName",
    "authEmail",
    "authPassword",
    "registerBtn",
    "loginBtn",
    "logoutBtn",
    "projectName",
    "projectDescription",
    "projectMembers",
    "createProjectBtn",
    "taskTitle",
    "taskDescription",
    "taskPriority",
    "taskStatus",
    "taskDueDate",
    "taskParent",
    "taskAssignees",
    "createTaskBtn",
    "welcomeText",
    "stats",
    "projectList",
    "taskList",
    "selectedProjectMeta",
    "authMessage",
    "authError",
  ].map((id) => [id, document.getElementById(id)]),
);
el.apiUrl.value = state.apiUrl;

function showMessage(target, text) {
  target.textContent = text;
  target.style.display = text ? "block" : "none";
}
function escapeHtml(v = "") {
  return v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function api(path, options = {}) {
  state.apiUrl = el.apiUrl.value.trim().replace(/\/$/, "");
  localStorage.setItem("apiUrl", state.apiUrl);
  const response = await fetch(`${state.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "API-Fehler");
  return data;
}
async function bootstrap() {
  renderAuthState();
  if (!state.token) return renderEmpty();
  try {
    await Promise.all([loadUsers(), loadProjects()]);
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
function renderAuthState() {
  el.welcomeText.textContent = state.user
    ? `Angemeldet als ${state.user.name} (${state.user.email}).`
    : "Bitte einloggen, um Projekte und Tasks zu laden.";
}
function renderEmpty() {
  el.stats.innerHTML = "";
  el.projectList.innerHTML = '<p class="muted">Noch keine Daten geladen.</p>';
  el.taskList.innerHTML = "";
  el.selectedProjectMeta.textContent = "";
}
async function loadUsers() {
  const { users } = await api("/users");
  state.users = users;
  populateUserSelects();
}
function populateUserSelects() {
  const options = state.users
    .map(
      (user) =>
        `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.globalRole)})</option>`,
    )
    .join("");
  el.projectMembers.innerHTML = options;
  el.taskAssignees.innerHTML = options;
}
async function loadProjects() {
  const { projects } = await api("/projects");
  state.projects = projects;
  state.selectedProjectId =
    state.selectedProjectId &&
    projects.some((p) => p.id === state.selectedProjectId)
      ? state.selectedProjectId
      : projects[0]?.id || null;
  renderProjects();
  updateStats();
  if (state.selectedProjectId) await loadTasks(state.selectedProjectId);
  else renderTasks([]);
}
async function loadTasks(projectId) {
  const { tasks } = await api(`/projects/${projectId}/tasks`);
  state.tasks = tasks;
  renderTasks(tasks);
  populateParentSelect(tasks);
  renderSelectedProjectMeta();
}
function updateStats() {
  const totalTasks = countTasks(state.tasks);
  const projects = state.projects.length;
  const admins = state.projects.filter((project) =>
    project.members.some(
      (member) => member.user.id === state.user?.id && member.role === "admin",
    ),
  ).length;
  const assigned = flattenTasks(state.tasks).filter(
    (task) => task.assignees.length,
  ).length;
  el.stats.innerHTML = [
    ["Projekte", projects],
    ["Tasks", totalTasks],
    ["Admin-Projekte", admins],
    ["Zugewiesen", assigned],
  ]
    .map(
      ([label, value]) =>
        `<div class="stat"><span class="muted">${label}</span><strong>${value}</strong></div>`,
    )
    .join("");
}
function renderProjects() {
  if (!state.projects.length) {
    el.projectList.innerHTML = '<p class="muted">Keine Projekte vorhanden.</p>';
    return;
  }
  el.projectList.innerHTML = state.projects
    .map((project) => {
      const myRole =
        project.members.find((member) => member.user.id === state.user.id)
          ?.role || "guest";
      const creator = project.createdBy?.name || "Unbekannt";
      return `<button class="secondary ${project.id === state.selectedProjectId ? "active" : ""}" data-project-id="${project.id}"><strong>${escapeHtml(project.name)}</strong><br><span class="muted">Erstellt von ${escapeHtml(creator)} · Rolle: ${escapeHtml(myRole)} · Mitglieder: ${project.members.length} · Tasks: ${project.taskCount}</span></button>`;
    })
    .join("");
  [...el.projectList.querySelectorAll("[data-project-id]")].forEach(
    (btn) =>
      (btn.onclick = async () => {
        state.selectedProjectId = btn.dataset.projectId;
        await loadTasks(state.selectedProjectId);
        renderProjects();
        updateStats();
      }),
  );
}
function renderSelectedProjectMeta() {
  const project = state.projects.find((p) => p.id === state.selectedProjectId);
  el.selectedProjectMeta.textContent = project
    ? `${project.name} · Erstellt von ${project.createdBy?.name || "Unbekannt"}`
    : "";
}
function renderTasks(tasks) {
  if (!tasks.length) {
    el.taskList.innerHTML =
      '<p class="muted">Keine Tasks für das gewählte Projekt.</p>';
    return;
  }
  el.taskList.innerHTML = tasks.map(renderTaskCard).join("");
}
function renderTaskCard(task) {
  const assignees = task.assignees.length
    ? task.assignees
        .map((user) => `<span class="pill">${escapeHtml(user.name)}</span>`)
        .join("")
    : '<span class="pill">Nicht zugewiesen</span>';
  const children = task.children.length
    ? `<div class="children">${task.children.map(renderTaskCard).join("")}</div>`
    : "";
  return `<div class="task" data-priority="${task.priority}"><div class="row" style="justify-content:space-between"><strong>${escapeHtml(task.title)}</strong><span class="pill">${escapeHtml(task.status)}</span></div><p>${escapeHtml(task.description || "Keine Beschreibung")}</p><div class="muted">Erstellt von ${escapeHtml(task.createdBy?.name || "Unbekannt")} · Fällig: ${escapeHtml(task.dueDate || "offen")}</div><div>${assignees}</div>${children}</div>`;
}
function flattenTasks(tasks) {
  return tasks.flatMap((task) => [task, ...flattenTasks(task.children || [])]);
}
function countTasks(tasks) {
  return flattenTasks(tasks).length;
}
function populateParentSelect(tasks) {
  const flat = flattenTasks(tasks);
  el.taskParent.innerHTML =
    '<option value="">Kein Parent</option>' +
    flat
      .map(
        (task) =>
          `<option value="${task.id}">${escapeHtml(task.title)}</option>`,
      )
      .join("");
}
async function register() {
  try {
    const payload = {
      name: el.registerName.value.trim(),
      email: el.authEmail.value.trim(),
      password: el.authPassword.value,
    };
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showMessage(
      el.authMessage,
      "Registrierung erfolgreich. Du kannst dich jetzt anmelden.",
    );
    showMessage(el.authError, "");
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function login() {
  try {
    const payload = {
      email: el.authEmail.value.trim(),
      password: el.authPassword.value,
    };
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
    showMessage(el.authMessage, "Login erfolgreich.");
    showMessage(el.authError, "");
    renderAuthState();
    await Promise.all([loadUsers(), loadProjects()]);
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (_) {}
  state.token = "";
  state.user = null;
  state.projects = [];
  state.tasks = [];
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  renderAuthState();
  renderEmpty();
}
async function createProject() {
  try {
    const members = [...el.projectMembers.selectedOptions].map((option) => ({
      userId: option.value,
      role: "employee",
    }));
    const payload = {
      name: el.projectName.value.trim(),
      description: el.projectDescription.value.trim(),
      members,
    };
    await api("/projects", { method: "POST", body: JSON.stringify(payload) });
    el.projectName.value = "";
    el.projectDescription.value = "";
    [...el.projectMembers.options].forEach(
      (option) => (option.selected = false),
    );
    await loadProjects();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
async function createTask() {
  try {
    const assigneeIds = [...el.taskAssignees.selectedOptions].map(
      (option) => option.value,
    );
    const payload = {
      title: el.taskTitle.value.trim(),
      description: el.taskDescription.value.trim(),
      priority: el.taskPriority.value,
      status: el.taskStatus.value,
      dueDate: el.taskDueDate.value || null,
      parentTaskId: el.taskParent.value || null,
      assigneeIds,
    };
    await api(`/projects/${state.selectedProjectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    ["taskTitle", "taskDescription", "taskDueDate"].forEach(
      (id) => (el[id].value = ""),
    );
    [...el.taskAssignees.options].forEach(
      (option) => (option.selected = false),
    );
    el.taskParent.value = "";
    await loadTasks(state.selectedProjectId);
    updateStats();
  } catch (error) {
    showMessage(el.authError, error.message);
  }
}
el.registerBtn.onclick = register;
el.loginBtn.onclick = login;
el.logoutBtn.onclick = logout;
el.createProjectBtn.onclick = createProject;
el.createTaskBtn.onclick = createTask;
bootstrap();
