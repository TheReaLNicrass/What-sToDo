const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '../../data/store.json');

const defaultState = {
  users: [],
  projects: [],
  project_members: [],
  tasks: [],
  task_assignees: [],
  sessions: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class DataStore {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.state = clone(defaultState);
    this.ensureLoaded();
  }

  ensureLoaded() {
    if (this.filePath === ':memory:') {
      this.state = this.createSeedState();
      return;
    }

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.state = this.createSeedState();
      this.persist();
      return;
    }

    const content = fs.readFileSync(this.filePath, 'utf8');
    this.state = content ? JSON.parse(content) : this.createSeedState();
  }

  createSeedState() {
    const adminId = crypto.randomUUID();
    const employeeId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const rootTaskId = crypto.randomUUID();
    const subTaskId = crypto.randomUUID();
    const now = new Date().toISOString();

    return {
      users: [
        { id: adminId, name: 'Admin Demo', email: 'admin@example.com', password: '', created_at: now },
        { id: employeeId, name: 'Mitarbeiter Demo', email: 'employee@example.com', password: '', created_at: now },
      ],
      projects: [
        {
          id: projectId,
          name: 'Website Relaunch',
          description: 'Migration von Frontend und Backend auf eine gemeinsame API.',
          owner_id: adminId,
          created_at: now,
          deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        },
      ],
      project_members: [
        { project_id: projectId, user_id: adminId, role: 2, joined_at: now },
        { project_id: projectId, user_id: employeeId, role: 1, joined_at: now },
      ],
      tasks: [
        {
          id: rootTaskId,
          project_id: projectId,
          parent_id: null,
          title: 'API mit Frontend verbinden',
          description: 'Daten aus dem Backend laden und Formular dynamisch befüllen.',
          priority: 2,
          status: 'in_progress',
          creator_id: adminId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          created_at: now,
        },
        {
          id: subTaskId,
          project_id: projectId,
          parent_id: rootTaskId,
          title: 'Task-Maske testen',
          description: 'Subtasks und Assignees im UI prüfen.',
          priority: 1,
          status: 'todo',
          creator_id: employeeId,
          deadline: null,
          created_at: now,
        },
      ],
      task_assignees: [
        { task_id: rootTaskId, user_id: employeeId, assigned_at: now },
        { task_id: subTaskId, user_id: adminId, assigned_at: now },
      ],
      sessions: [],
    };
  }

  persist() {
    if (this.filePath === ':memory:') return;
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  reset() {
    this.state = this.createSeedState();
    this.persist();
  }

  getState() {
    return clone(this.state);
  }

  update(mutator) {
    const draft = clone(this.state);
    this.state = mutator(draft) || draft;
    this.persist();
    return this.getState();
  }
}

module.exports = { DataStore, defaultState };