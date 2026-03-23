const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { DataStore } = require('../data/store');

const ROLE_LEVELS = {
  guest: 0,
  employee: 1,
  admin: 2,
};

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
    createdAt: user.createdAt,
  };
}

class StoreService {
  constructor(store = new DataStore()) {
    this.store = store;
  }

  listUsers() {
    return this.store.getState().users.map(publicUser);
  }

  async register({ name, email, password, globalRole = 'employee' }) {
    if (!name || !email || !password) {
      throw this.badRequest('name, email und password sind erforderlich.');
    }

    const state = this.store.getState();
    if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      throw this.badRequest('E-Mail ist bereits registriert.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      globalRole,
      createdAt: new Date().toISOString(),
    };

    this.store.update((draft) => {
      draft.users.push(user);
      return draft;
    });

    return publicUser(user);
  }

  async login({ email, password }) {
    const state = this.store.getState();
    const user = state.users.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      throw this.unauthorized('Ungültige Zugangsdaten.');
    }

    const isDemoUser = !user.passwordHash;
    const isValid = isDemoUser ? password === 'demo1234' : await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw this.unauthorized('Ungültige Zugangsdaten.');
    }

    const token = crypto.randomUUID();
    this.store.update((draft) => {
      draft.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
      return draft;
    });

    return { token, user: publicUser(user) };
  }

  logout(token) {
    this.store.update((draft) => {
      draft.sessions = draft.sessions.filter((session) => session.token !== token);
      return draft;
    });
  }

  getUserByToken(token) {
    if (!token) {
      return null;
    }

    const state = this.store.getState();
    const session = state.sessions.find((entry) => entry.token === token);
    if (!session) {
      return null;
    }

    return state.users.find((user) => user.id === session.userId) || null;
  }

  createProject(currentUser, payload) {
    if (!payload.name) {
      throw this.badRequest('Projektname ist erforderlich.');
    }

    const project = {
      id: crypto.randomUUID(),
      name: payload.name,
      description: payload.description || '',
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      members: [
        { userId: currentUser.id, role: 'admin' },
        ...((payload.members || [])
          .filter((member) => member.userId && member.userId !== currentUser.id)
          .map((member) => ({ userId: member.userId, role: member.role || 'guest' }))),
      ],
    };

    this.validateMembers(project.members);
    this.store.update((draft) => {
      draft.projects.push(project);
      return draft;
    });

    return this.getProjectByIdForUser(project.id, currentUser.id);
  }

  listProjectsForUser(userId) {
    const state = this.store.getState();
    return state.projects
      .filter((project) => project.members.some((member) => member.userId === userId))
      .map((project) => this.enrichProject(project, state));
  }

  getProjectByIdForUser(projectId, userId) {
    const state = this.store.getState();
    const project = state.projects.find((entry) => entry.id === projectId);
    if (!project) {
      throw this.notFound('Projekt nicht gefunden.');
    }

    const membership = project.members.find((member) => member.userId === userId);
    if (!membership) {
      throw this.forbidden('Kein Zugriff auf dieses Projekt.');
    }

    return this.enrichProject(project, state);
  }

  createTask(currentUser, projectId, payload) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'employee');

    if (!payload.title) {
      throw this.badRequest('Task-Titel ist erforderlich.');
    }

    if (payload.assigneeIds?.length) {
      payload.assigneeIds.forEach((userId) => this.assertProjectMember(project, userId));
    }

    if (payload.parentTaskId) {
      const parent = this.getTaskById(currentUser.id, payload.parentTaskId);
      if (parent.project.id !== projectId) {
        throw this.badRequest('parentTaskId muss zum gleichen Projekt gehören.');
      }
    }

    const task = {
      id: crypto.randomUUID(),
      projectId,
      parentTaskId: payload.parentTaskId || null,
      title: payload.title,
      description: payload.description || '',
      status: payload.status || 'todo',
      priority: payload.priority || 'medium',
      createdBy: currentUser.id,
      assigneeIds: payload.assigneeIds || [],
      dueDate: payload.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.update((draft) => {
      draft.tasks.push(task);
      return draft;
    });

    return this.getTaskById(currentUser.id, task.id);
  }

  listTasksForProject(currentUser, projectId) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    const state = this.store.getState();
    const tasks = state.tasks.filter((task) => task.projectId === projectId);
    return this.buildTaskTree(tasks, state.users).map((task) => ({ ...task, project }));
  }

  getTaskById(userId, taskId) {
    const state = this.store.getState();
    const task = state.tasks.find((entry) => entry.id === taskId);
    if (!task) {
      throw this.notFound('Task nicht gefunden.');
    }

    const project = this.getProjectByIdForUser(task.projectId, userId);
    return { ...this.enrichTask(task, state.users, state.tasks), project };
  }

  enrichProject(project, state) {
    const usersById = new Map(state.users.map((user) => [user.id, publicUser(user)]));
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      createdBy: usersById.get(project.createdBy) || null,
      role: project.members.find((member) => member.userId === (project.currentUserId || project.createdBy))?.role,
      members: project.members.map((member) => ({
        role: member.role,
        user: usersById.get(member.userId) || { id: member.userId },
      })),
      taskCount: tasks.length,
    };
  }

  enrichTask(task, users, tasks) {
    const usersById = new Map(users.map((user) => [user.id, publicUser(user)]));
    const children = tasks.filter((entry) => entry.parentTaskId === task.id).map((child) => this.enrichTask(child, users, tasks));
    return {
      id: task.id,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      createdBy: usersById.get(task.createdBy) || null,
      assignees: task.assigneeIds.map((userId) => usersById.get(userId)).filter(Boolean),
      children,
    };
  }

  buildTaskTree(tasks, users) {
    return tasks.filter((task) => !task.parentTaskId).map((task) => this.enrichTask(task, users, tasks));
  }

  addProjectMember(currentUser, projectId, { userId, role = 'guest' }) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    this.assertProjectMemberExistsInUserBase(userId);

    this.store.update((draft) => {
      const targetProject = draft.projects.find((entry) => entry.id === projectId);
      const existing = targetProject.members.find((member) => member.userId === userId);
      if (existing) {
        existing.role = role;
      } else {
        targetProject.members.push({ userId, role });
      }
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  setTaskAssignees(currentUser, taskId, assigneeIds = []) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));

    this.store.update((draft) => {
      const targetTask = draft.tasks.find((entry) => entry.id === taskId);
      targetTask.assigneeIds = assigneeIds;
      targetTask.updatedAt = new Date().toISOString();
      return draft;
    });

    return this.getTaskById(currentUser.id, taskId);
  }

  assertProjectMember(project, userId) {
    const found = project.members.find((member) => member.user.id === userId || member.userId === userId);
    if (!found) {
      throw this.badRequest('Zugeordnete Person ist kein Projektmitglied.');
    }
  }

  assertProjectMemberExistsInUserBase(userId) {
    const state = this.store.getState();
    if (!state.users.some((user) => user.id === userId)) {
      throw this.badRequest('Benutzer nicht gefunden.');
    }
  }

  assertProjectRole(project, userId, requiredRole) {
    const member = project.members.find((entry) => entry.user.id === userId || entry.userId === userId);
    const memberRole = member?.role || 'guest';
    if (ROLE_LEVELS[memberRole] < ROLE_LEVELS[requiredRole]) {
      throw this.forbidden('Unzureichende Berechtigungen.');
    }
  }

  validateMembers(members) {
    const seen = new Set();
    members.forEach((member) => {
      if (!ROLE_LEVELS.hasOwnProperty(member.role)) {
        throw this.badRequest('Ungültige Rolle.');
      }
      if (seen.has(member.userId)) {
        throw this.badRequest('Mitglied doppelt angegeben.');
      }
      seen.add(member.userId);
      this.assertProjectMemberExistsInUserBase(member.userId);
    });
  }

  badRequest(message) {
    return Object.assign(new Error(message), { status: 400 });
  }
  unauthorized(message) {
    return Object.assign(new Error(message), { status: 401 });
  }
  forbidden(message) {
    return Object.assign(new Error(message), { status: 403 });
  }
  notFound(message) {
    return Object.assign(new Error(message), { status: 404 });
  }
}

module.exports = { StoreService, ROLE_LEVELS };