const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../app");
const { StoreService } = require("../services/storeService");
const { DataStore } = require("../data/store");

async function createTestClient() {
  const store = new DataStore(":memory:");
  store.reset();
  const service = new StoreService(store);
  const app = createApp({ storeService: service });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  }

  return {
    request,
    close: () => new Promise((resolve) => server.close(resolve)),
    store,
  };
}

test("Registrierung, Login, Projekterstellung und Task-Zuweisung funktionieren integriert", async () => {
  const client = await createTestClient();
  try {
    const register = await client.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Lisa",
        email: "lisa@example.com",
        password: "secret123",
      }),
    });
    assert.equal(register.response.status, 201);
    assert.equal(register.body.user.email, "lisa@example.com");

    const login = await client.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "demo1234",
      }),
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.body.token);
    const authHeader = { Authorization: `Bearer ${login.body.token}` };

    const users = await client.request("/api/users", { headers: authHeader });
    assert.equal(users.response.status, 200);
    const lisa = users.body.users.find(
      (user) => user.email === "lisa@example.com",
    );
    assert.ok(lisa);

    const createdProject = await client.request("/api/projects", {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        name: "Neues Kundenprojekt",
        description: "Mit Rollen und Mitgliedern",
        members: [{ userId: lisa.id, role: "employee" }],
      }),
    });
    assert.equal(createdProject.response.status, 201);
    assert.equal(
      createdProject.body.project.createdBy.email,
      "admin@example.com",
    );
    assert.equal(createdProject.body.project.members.length, 2);

    const createdTask = await client.request(
      `/api/projects/${createdProject.body.project.id}/tasks`,
      {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          title: "Kickoff vorbereiten",
          description: "Agenda und Teilnehmer sammeln",
          assigneeIds: [lisa.id],
          priority: "high",
          status: "todo",
        }),
      },
    );
    assert.equal(createdTask.response.status, 201);
    assert.equal(createdTask.body.task.assignees[0].email, "lisa@example.com");
    assert.equal(createdTask.body.task.createdBy.email, "admin@example.com");

    const tasks = await client.request(
      `/api/projects/${createdProject.body.project.id}/tasks`,
      { headers: authHeader },
    );
    assert.equal(tasks.response.status, 200);
    assert.equal(tasks.body.tasks.length, 1);
  } finally {
    await client.close();
  }
});

test("Rechteverwaltung blockiert Task-Erstellung für Gäste", async () => {
  const client = await createTestClient();
  try {
    const adminLogin = await client.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "demo1234",
      }),
    });
    const adminHeader = { Authorization: `Bearer ${adminLogin.body.token}` };

    const register = await client.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Gast",
        email: "gast@example.com",
        password: "secret123",
      }),
    });
    const guestUser = register.body.user;

    const baseProject = await client.request("/api/projects", {
      method: "POST",
      headers: adminHeader,
      body: JSON.stringify({
        name: "Readonly Projekt",
        members: [{ userId: guestUser.id, role: "guest" }],
      }),
    });

    const guestLogin = await client.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "gast@example.com",
        password: "secret123",
      }),
    });
    const guestHeader = { Authorization: `Bearer ${guestLogin.body.token}` };

    const denied = await client.request(
      `/api/projects/${baseProject.body.project.id}/tasks`,
      {
        method: "POST",
        headers: guestHeader,
        body: JSON.stringify({ title: "Sollte scheitern" }),
      },
    );

    assert.equal(denied.response.status, 403);
    assert.match(denied.body.error, /Berechtigungen/);
  } finally {
    await client.close();
  }
});
