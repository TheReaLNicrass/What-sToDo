(async () => {
  const common = window.AppCommon;
  document.getElementById('app').innerHTML = common.renderShell({
    pageTitle: 'Projekte und Mitglieder',
    pageDescription: 'Eigene Oberfläche für Projekte, Projektmitglieder und Deadline-Pflege auf Basis des Projektschemas.',
    pageKey: 'projects',
  });
  common.bindShell();
  const user = await common.loadSessionUser();
  if (!common.requireAuth(user)) return;

  const state = { users: [], projects: [], selectedProjectId: common.getCurrentProjectId(), members: [] };
  document.getElementById('pageContent').innerHTML = `
    <section class="content-grid">
      <article class="panel card section-stack">
        <div class="section-head"><div><p class="eyebrow">Projekt</p><h3>Projekt anlegen / bearbeiten</h3></div><button id="newProjectBtn" class="ghost small">Neu</button></div>
        <label class="field"><span>Name</span><input id="projectName" /></label>
        <label class="field"><span>Beschreibung</span><textarea id="projectDescription"></textarea></label>
        <label class="field"><span>Deadline</span><input id="projectDeadline" type="datetime-local" /></label>
        <label class="field"><span>Mitglieder beim Anlegen</span><select id="projectMembers" multiple size="6"></select></label>
        <div class="action-row"><button id="saveProjectBtn" class="primary">Speichern</button><button id="deleteProjectBtn" class="danger">Löschen</button></div>
      </article>
      <article class="panel card section-stack">
        <div class="section-head"><div><p class="eyebrow">Projektliste</p><h3>Vorhandene Projekte</h3></div><a class="ghost link-button small" href="/dashboard">Zurück zum Dashboard</a></div>
        <div id="projectList" class="stack-list"></div>
      </article>
    </section>
    <section class="panel card section-stack">
      <div class="section-head"><div><p class="eyebrow">Mitglieder</p><h3>Projektteam verwalten</h3></div></div>
      <div class="grid two">
        <label class="field"><span>Benutzer</span><select id="memberUser"></select></label>
        <label class="field"><span>Rolle</span><select id="memberRole"><option value="guest">Guest</option><option value="employee">Mitarbeiter</option><option value="admin">Admin</option></select></label>
      </div>
      <div class="action-row"><button id="addMemberBtn" class="primary">Hinzufügen</button><button id="updateMemberBtn" class="secondary">Rolle ändern</button><button id="removeMemberBtn" class="danger">Entfernen</button></div>
      <div id="memberList" class="stack-list"></div>
    </section>`;

  const toInputDateTime = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');
  const toApiDateTime = (value) => (value ? new Date(value).toISOString() : null);

  function resetForm() {
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectDeadline').value = '';
    Array.from(document.getElementById('projectMembers').options).forEach((option) => { option.selected = false; });
  }

  function populateUsers() {
    const options = state.users.map((entry) => `<option value="${entry.id}">${common.escapeHtml(entry.name)} · ${common.escapeHtml(entry.email)}</option>`).join('');
    document.getElementById('projectMembers').innerHTML = options;
    document.getElementById('memberUser').innerHTML = `<option value="">Bitte wählen</option>${options}`;
  }

  function renderProjects() {
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = state.projects.length ? state.projects.map((project) => `
      <button class="list-item ${project.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${project.id}">
        <div><strong>${common.escapeHtml(project.name)}</strong><p class="muted">${common.escapeHtml(project.description || 'Keine Beschreibung')}</p></div>
        <div class="meta-column"><span class="badge neutral">${common.escapeHtml(project.role)}</span><span class="muted">${project.taskCount} Tasks</span></div>
      </button>`).join('') : '<p class="muted">Noch keine Projekte vorhanden.</p>';

    projectList.querySelectorAll('[data-project-id]').forEach((button) => {
      button.onclick = async () => {
        state.selectedProjectId = button.dataset.projectId;
        common.setCurrentProjectId(state.selectedProjectId);
        await loadProjectContext();
      };
    });
  }

  function renderMembers() {
    const memberList = document.getElementById('memberList');
    memberList.innerHTML = state.members.length ? state.members.map((member) => `
      <div class="list-item static">
        <div><strong>${common.escapeHtml(member.user.name)}</strong><p class="muted">${common.escapeHtml(member.user.email)}</p></div>
        <div class="meta-column"><span class="badge neutral">${common.escapeHtml(member.role)}</span><span class="muted">seit ${common.escapeHtml((member.joinedAt || '').slice(0, 10))}</span></div>
      </div>`).join('') : '<p class="muted">Bitte Projekt wählen.</p>';
  }

  function hydrateProject(project) {
    if (!project) {
      resetForm();
      return;
    }
    document.getElementById('projectName').value = project.name || '';
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectDeadline').value = toInputDateTime(project.deadline);
  }

  async function loadUsersAndProjects() {
    const [usersRes, projectsRes] = await Promise.all([common.api('/users'), common.api('/projects')]);
    state.users = usersRes.users || [];
    state.projects = projectsRes.projects || [];
    if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
      state.selectedProjectId = state.projects[0]?.id || '';
    }
    populateUsers();
    renderProjects();
  }

  async function loadProjectContext() {
    if (!state.selectedProjectId) {
      state.members = [];
      resetForm();
      renderProjects();
      renderMembers();
      return;
    }

    const [projectRes, membersRes] = await Promise.all([
      common.api(`/projects/${state.selectedProjectId}`),
      common.api(`/projects/${state.selectedProjectId}/members`),
    ]);
    state.members = membersRes.members || [];
    hydrateProject(projectRes.project);
    renderProjects();
    renderMembers();
  }

  document.getElementById('newProjectBtn').onclick = () => {
    state.selectedProjectId = '';
    common.setCurrentProjectId('');
    resetForm();
    renderProjects();
    renderMembers();
  };

  document.getElementById('saveProjectBtn').onclick = async () => {
    try {
      const payload = {
        name: document.getElementById('projectName').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        deadline: toApiDateTime(document.getElementById('projectDeadline').value),
      };

      let createdNew = false;
      if (state.selectedProjectId) {
        await common.api(`/projects/${state.selectedProjectId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        payload.members = Array.from(document.getElementById('projectMembers').selectedOptions).map((option) => ({ userId: option.value, role: 'employee' }));
        const created = await common.api('/projects', { method: 'POST', body: JSON.stringify(payload) });
        state.selectedProjectId = created.project.id;
        common.setCurrentProjectId(state.selectedProjectId);
        createdNew = true;
      }

      await loadUsersAndProjects();
      await loadProjectContext();
      common.notify('success', 'Projekt gespeichert.');
      if (createdNew) {
        setTimeout(() => { location.href = '/dashboard'; }, 250);
      }
    } catch (error) {
      common.notify('error', error.message);
    }
  };

  document.getElementById('deleteProjectBtn').onclick = async () => {
    if (!state.selectedProjectId) return common.notify('error', 'Bitte zuerst ein Projekt auswählen.');
    try {
      await common.api(`/projects/${state.selectedProjectId}`, { method: 'DELETE' });
      state.selectedProjectId = '';
      common.setCurrentProjectId('');
      await loadUsersAndProjects();
      await loadProjectContext();
      common.notify('success', 'Projekt gelöscht.');
    } catch (error) {
      common.notify('error', error.message);
    }
  };

  async function changeMember(mode) {
    if (!state.selectedProjectId) return common.notify('error', 'Bitte zuerst ein Projekt auswählen.');
    const userId = document.getElementById('memberUser').value;
    const role = document.getElementById('memberRole').value;
    if (!userId) return common.notify('error', 'Bitte einen Benutzer auswählen.');
    try {
      if (mode === 'add') await common.api(`/projects/${state.selectedProjectId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) });
      if (mode === 'update') await common.api(`/projects/${state.selectedProjectId}/members/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) });
      if (mode === 'remove') await common.api(`/projects/${state.selectedProjectId}/members/${userId}`, { method: 'DELETE' });
      await loadUsersAndProjects();
      await loadProjectContext();
      common.notify('success', 'Mitglieder aktualisiert.');
    } catch (error) {
      common.notify('error', error.message);
    }
  }

  document.getElementById('addMemberBtn').onclick = () => changeMember('add');
  document.getElementById('updateMemberBtn').onclick = () => changeMember('update');
  document.getElementById('removeMemberBtn').onclick = () => changeMember('remove');

  await loadUsersAndProjects();
  await loadProjectContext();
})();