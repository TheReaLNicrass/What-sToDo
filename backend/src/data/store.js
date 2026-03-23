const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '../../data/store.json');

const defaultState = {
  users: [],
  projects: [],
  tasks: [],
  sessions: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class DataStore {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.state = defaultState;
    this.ensureLoaded();
  }

  ensureLoaded() {
    if (this.filePath === ':memory:') {
      this.state = this.createSeedState();
      return;
    }

    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

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
    const taskId = crypto.randomUUID();

    return {
      users: [
        {
          id: adminId,
          name: 'Admin Demo',
          email: 'admin@example.com',
          passwordHash: '',
          globalRole: 'admin',
          createdAt: new Date().toISOString(),
        },
        {
          id: employeeId,
          name: 'Mitarbeiter Demo',
          email: 'employee@example.com',
          passwordHash: '',
          globalRole: 'employee',
          createdAt: new Date().toISOString(),
        },
      ],
      projects: [
        {
          id: projectId,
          name: 'Website Relaunch',
          description: 'Migration von Frontend und Backend auf eine gemeinsame API.',
          createdBy: adminId,
          createdAt: new Date().toISOString(),
          members: [
            { userId: adminId, role: 'admin' },
            { userId: employeeId, role: 'employee' },
          ],
        },
      ],
      tasks: [
        {
          id: taskId,
          projectId,
          parentTaskId: null,
          title: 'API mit Frontend verbinden',
          description: 'Daten aus dem Backend laden und Formular dynamisch befüllen.',
          status: 'in_progress',
          priority: 'high',
          createdBy: adminId,
          assigneeIds: [employeeId],
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      sessions: [],
    };
  }

  persist() {
    if (this.filePath === ':memory:') {
      return;
    }

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
    const result = mutator(draft) || draft;
    this.state = result;
    this.persist();
    return this.getState();
  }
}

module.exports = { DataStore, defaultState };