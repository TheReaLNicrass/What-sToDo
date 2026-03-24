const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { StoreService } = require('../services/storeService');
const { DataStore } = require('../data/store');

async function createTestClient() {
  const store = new DataStore(':memory:');
  store.reset();
  const service = new StoreService(store);
  const app = createApp({ storeService: service });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  }

  return {
    request,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function login(client, email, password = 'demo1234') {
  const result = await client.request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return {
    auth: { Cookie: (result.response.headers.get('set-cookie') || '').split(';')[0] },
    body: result.body,
  };
}

test('kompletter CRUD-Flow für Projekte, Mitglieder, Tasks und Assignees funktioniert', async () => {
  const client = await createTestClient();
  try {
    const register = await client.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Lisa',
        email: 'lisa@example.com',
        password: 'secret123',
      }),
    });
    assert.equal(register.response.status, 201);

    const { auth } = await login(client, 'admin@example.com');
    const users = await client.request('/api/users', { headers: auth });
    const lisa = users.body.users.find((user) => user.email === 'lisa@example.com');
    assert.ok(lisa);

    const createdProject = await client.request('/api/projects', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Neues Kundenprojekt',
        description: 'Mit Rollen und Mitgliedern',
        deadline: '2026-04-15',
        members: [{ userId: lisa.id, role: 'employee' }],
      }),
    });
    assert.equal(createdProject.response.status, 201);

    const projectId = createdProject.body.project.id;
    const members = await client.request(`/api/projects/${projectId}/members`, { headers: auth });
    assert.equal(members.body.members.length, 2);

    const promote = await client.request(`/api/projects/${projectId}/members/${lisa.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(promote.response.status, 200);
    assert.equal(promote.body.project.members.find((member) => member.user.id === lisa.id).role, 'admin');

    const createdTask = await client.request(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: 'Kickoff vorbereiten',
        description: 'Agenda und Teilnehmer sammeln',
        assigneeIds: [lisa.id],
        priority: 'high',
        status: 'open',
      }),
    });
    assert.equal(createdTask.response.status, 201);

    const taskId = createdTask.body.task.id;
    const taskDetails = await client.request(`/api/tasks/${taskId}`, { headers: auth });
    assert.equal(taskDetails.body.task.assignees[0].email, 'lisa@example.com');

    const subtask = await client.request(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: 'Präsentation finalisieren',
        parentTaskId: taskId,
        status: 'in_progress',
      }),
    });
    assert.equal(subtask.response.status, 201);

    const subtasks = await client.request(`/api/tasks/${taskId}/subtasks`, { headers: auth });
    assert.equal(subtasks.body.tasks.length, 1);

    const employeeId = users.body.users.find((user) => user.email === 'employee@example.com').id;
    await client.request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ userId: employeeId, role: 'employee' }),
    });

    const assigneeAdd = await client.request(`/api/tasks/${taskId}/assignees`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ userId: employeeId }),
    });
    assert.equal(assigneeAdd.response.status, 201);
    assert.equal(assigneeAdd.body.task.assignees.length, 2);

    const assignees = await client.request(`/api/tasks/${taskId}/assignees`, { headers: auth });
    assert.equal(assignees.body.assignees.length, 2);

    const taskUpdate = await client.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ status: 'done', priority: 'low' }),
    });
    assert.equal(taskUpdate.body.task.status, 'done');
    assert.equal(taskUpdate.body.task.priority, 'low');

    const deleteAssignee = await client.request(`/api/tasks/${taskId}/assignees/${lisa.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.equal(deleteAssignee.response.status, 204);

    const deleteTask = await client.request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.equal(deleteTask.response.status, 204);

    const deleteProject = await client.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.equal(deleteProject.response.status, 204);
  } finally {
    await client.close();
  }
});

test('Rechteverwaltung blockiert Task-Erstellung für Gäste', async () => {
  const client = await createTestClient();
  try {
    const register = await client.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Gast',
        email: 'gast@example.com',
        password: 'secret123',
      }),
    });
    const guestUser = register.body.user;
    const { auth } = await login(client, 'admin@example.com');

    const baseProject = await client.request('/api/projects', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Readonly Projekt',
        members: [{ userId: guestUser.id, role: 'guest' }],
      }),
    });

    const guestLogin = await login(client, 'gast@example.com', 'secret123');
    const denied = await client.request(`/api/projects/${baseProject.body.project.id}/tasks`, {
      method: 'POST',
      headers: guestLogin.auth,
      body: JSON.stringify({ title: 'Sollte scheitern', status: 'open' }),
    });

    assert.equal(denied.response.status, 403);
  } finally {
    await client.close();
  }
});