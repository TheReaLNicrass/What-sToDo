(async () => {
  const common = window.AppCommon;
  document.getElementById('app').innerHTML = common.renderShell({
    pageTitle: 'Aufgaben und Hierarchien',
    pageDescription: 'Eigene Seite für Tasks mit Parent/Child-Struktur, Assignees, Prioritäten und Deadlines.',
    pageKey: 'tasks',
  });
  common.bindShell();
  const user = await common.loadSessionUser();
  if (!common.requireAuth(user)) return;

  const state = { projects: [], members: [], tasks: [], selectedProjectId: common.getCurrentProjectId(), taskPath: [] };
  document.getElementById('pageContent').innerHTML = `
    <section class="content-grid">
      <article class="panel card section-stack">
        <div class="section-head"><div><p class="eyebrow">Kontext</p><h3>Projekt wählen</h3></div><a class="ghost link-button small" href="/dashboard">Zurück zum Dashboard</a></div>
        <label class="field"><span>Projekt</span><select id="projectSelect"></select></label>
        <div id="projectMeta" class="muted"></div>
      </article>
      <article class="panel card section-stack">
        <div class="section-head"><div><p class="eyebrow">Task</p><h3>Aufgabe anlegen / bearbeiten</h3></div><button id="newTaskBtn" class="ghost small">Neu</button></div>
        <input id="taskId" type="hidden" />
        <label class="field"><span>Titel</span><input id="taskTitle" /></label>
        <label class="field"><span>Beschreibung</span><textarea id="taskDescription"></textarea></label>
        <div class="grid two">
          <label class="field"><span>Priorität</span><select id="taskPriority"><option value="low">Niedrig</option><option value="medium">Mittel</option><option value="high">Hoch</option></select></label>
          <label class="field"><span>Status</span><select id="taskStatus"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></label>
        </div>
        <div class="grid two">
          <label class="field"><span>Deadline</span><input id="taskDeadline" type="datetime-local" /></label>
          <label class="field"><span>Parent Task</span><select id="taskParent"></select></label>
        </div>
        <label class="field"><span>Assignees</span><select id="taskAssignees" multiple size="6"></select></label>
        <div class="action-row"><button id="saveTaskBtn" class="primary">Speichern</button><button id="deleteTaskBtn" class="danger">Löschen</button></div>
      </article>
    </section>
    <section class="panel card section-stack">
      <div class="section-head"><div><p class="eyebrow">Explorer</p><h3>Task-Hierarchie</h3></div><div class="task-nav"><button id="upBtn" class="ghost small">Eine Ebene hoch</button><div id="breadcrumb" class="muted"></div></div></div>
      <div id="taskList" class="task-tree"></div>
    </section>`;

  const toInputDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';
  const toApiDateTime = (value) => value ? new Date(value).toISOString() : null;
  const flattenTasks = (tasks = []) => tasks.flatMap((task) => [task, ...flattenTasks(task.subtasks || [])]);
  const findTask = (taskId, tasks = state.tasks) => {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const nested = findTask(taskId, task.subtasks || []);
      if (nested) return nested;
    }
    return null;
  };
  const currentLevel = () => {
    let tasks = state.tasks;
    for (const id of state.taskPath) tasks = findTask(id, state.tasks)?.subtasks || [];
    return tasks;
  };
  function resetTaskForm() {
    document.getElementById('taskId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStatus').value = 'open';
    document.getElementById('taskDeadline').value = '';
    Array.from(document.getElementById('taskAssignees').options).forEach((option) => { option.selected = false; });
  }
  function renderProjectSelect() {
    const select = document.getElementById('projectSelect');
    select.innerHTML = state.projects.map((project) => `<option value="${project.id}" ${project.id === state.selectedProjectId ? 'selected' : ''}>${common.escapeHtml(project.name)}</option>`).join('');
    document.getElementById('projectMeta').textContent = state.projects.find((entry) => entry.id === state.selectedProjectId)?.description || '';
  }
  function populateParentAndAssignees() {
    const taskId = document.getElementById('taskId').value;
    document.getElementById('taskParent').innerHTML = `<option value="">Kein Parent</option>${flattenTasks(state.tasks).filter((task) => task.id !== taskId).map((task) => `<option value="${task.id}">${common.escapeHtml(task.title)}</option>`).join('')}`;
    document.getElementById('taskAssignees').innerHTML = state.members.map((member) => `<option value="${member.user.id}">${common.escapeHtml(member.user.name)}</option>`).join('');
  }
  function renderBreadcrumb() {
    document.getElementById('breadcrumb').textContent = ['Root', ...state.taskPath.map((id) => findTask(id)?.title || 'Task')].join(' / ');
    document.getElementById('upBtn').disabled = state.taskPath.length === 0;
  }
  function renderTasks() {
    const list = document.getElementById('taskList');
    const tasks = currentLevel();
    list.innerHTML = tasks.length ? tasks.map((task) => `
      <article class="task-card" data-priority="${common.escapeHtml(task.priority)}">
        <div class="task-card-head">
          <div><h4>${common.escapeHtml(task.title)}</h4><p class="muted">${common.escapeHtml(task.description || 'Keine Beschreibung')}</p></div>
          <div class="task-actions"><span class="badge neutral">${common.escapeHtml(task.status)}</span><button class="ghost small" data-edit="${task.id}">Bearbeiten</button>${task.subtasks?.length ? `<button class="secondary small" data-open="${task.id}">Subtasks (${task.subtasks.length})</button>` : ''}</div>
        </div>
        <div class="task-card-meta"><span>Deadline: ${common.escapeHtml((task.dueDate || '').slice(0, 16) || 'offen')}</span><span>Priorität: ${common.escapeHtml(task.priority)}</span><span>Assignees: ${(task.assignees || []).map((u) => common.escapeHtml(u.name)).join(', ') || '—'}</span></div>
      </article>`).join('') : '<p class="muted">Keine Tasks auf dieser Ebene.</p>';
    list.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => loadTask(button.dataset.edit));
    list.querySelectorAll('[data-open]').forEach((button) => button.onclick = () => { state.taskPath.push(button.dataset.open); renderTasks(); });
    renderBreadcrumb();
  }
  async function loadData() {
    const projectsRes = await common.api('/projects');
    state.projects = projectsRes.projects || [];
    if (!state.projects.some((project) => project.id === state.selectedProjectId)) state.selectedProjectId = state.projects[0]?.id || '';
    common.setCurrentProjectId(state.selectedProjectId);
    renderProjectSelect();
    if (!state.selectedProjectId) {
      state.members = []; state.tasks = []; populateParentAndAssignees(); renderTasks(); return;
    }
    const [membersRes, tasksRes] = await Promise.all([
      common.api(`/projects/${state.selectedProjectId}/members`),
      common.api(`/projects/${state.selectedProjectId}/tasks`),
    ]);
    state.members = membersRes.members || [];
    state.tasks = tasksRes.tasks || [];
    populateParentAndAssignees();
    renderTasks();
  }
  async function loadTask(taskId) {
    try {
      const result = await common.api(`/tasks/${taskId}`);
      const task = result.task;
      document.getElementById('taskId').value = task.id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDescription').value = task.description || '';
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskDeadline').value = toInputDateTime(task.dueDate);
      populateParentAndAssignees();
      document.getElementById('taskParent').value = task.parentTaskId || '';
      const ids = new Set((task.assignees || []).map((entry) => entry.id));
      Array.from(document.getElementById('taskAssignees').options).forEach((option) => { option.selected = ids.has(option.value); });
    } catch (error) {
      common.notify('error', error.message);
    }
  }

  document.getElementById('projectSelect').onchange = async (event) => { state.selectedProjectId = event.target.value; state.taskPath = []; common.setCurrentProjectId(state.selectedProjectId); await loadData(); };
  document.getElementById('newTaskBtn').onclick = resetTaskForm;
  document.getElementById('upBtn').onclick = () => { state.taskPath.pop(); renderTasks(); };
  document.getElementById('saveTaskBtn').onclick = async () => {
    if (!state.selectedProjectId) return common.notify('error', 'Bitte zuerst ein Projekt wählen.');
    try {
      const payload = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value,
        dueDate: toApiDateTime(document.getElementById('taskDeadline').value),
        parentTaskId: document.getElementById('taskParent').value || null,
        assigneeIds: Array.from(document.getElementById('taskAssignees').selectedOptions).map((option) => option.value),
      };
      const taskId = document.getElementById('taskId').value;
      const createdNew = !taskId;
      if (taskId) await common.api(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await common.api(`/projects/${state.selectedProjectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
      resetTaskForm();
      await loadData();
      common.notify('success', 'Task gespeichert.');
      if (createdNew) {
        setTimeout(() => { location.href = '/dashboard'; }, 250);
      }
    } catch (error) {
      common.notify('error', error.message);
    }
  };
  document.getElementById('deleteTaskBtn').onclick = async () => {
    const taskId = document.getElementById('taskId').value;
    if (!taskId) return common.notify('error', 'Bitte zuerst eine Task laden.');
    try {
      await common.api(`/tasks/${taskId}`, { method: 'DELETE' });
      resetTaskForm();
      await loadData();
      common.notify('success', 'Task gelöscht.');
    } catch (error) {
      common.notify('error', error.message);
    }
  };

  await loadData();
})();