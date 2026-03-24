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
    createdAt: user.created_at,
    createdAt: user.created_at,
  };
}

class StoreService {
  constructor(store = new DataStore()) {
    this.store = store;
  }

  listUsers() {
    return this.store.getState().users.map(publicUser);
  }

  getUserById(userId) {
    const user = this.store.getState().users.find((entry) => entry.id === userId);
    if (!user) {
      throw this.notFound('Benutzer nicht gefunden.');
    }
    return publicUser(user);
  }

  async register({ name, email, password }) {
  getUserById(userId) {
    const user = this.store.getState().users.find((entry) => entry.id === userId);
    if (!user) {
      throw this.notFound('Benutzer nicht gefunden.');
    }
    return publicUser(user);
  }

  async register({ name, email, password }) {
    if (!name || !email || !password) {
      throw this.badRequest('name, email und password sind erforderlich.');
    }

    const state = this.store.getState();
    if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      throw this.badRequest('E-Mail ist bereits registriert.');
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      created_at: new Date().toISOString(),
      password: await bcrypt.hash(password, 10),
      created_at: new Date().toISOString(),
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

    const isDemoUser = !user.password;
    const valid = isDemoUser ? password === 'demo1234' : await bcrypt.compare(password, user.password);
    if (!valid) {
    const isDemoUser = !user.password;
    const valid = isDemoUser ? password === 'demo1234' : await bcrypt.compare(password, user.password);
    if (!valid) {
      throw this.unauthorized('Ungültige Zugangsdaten.');
    }

    const token = crypto.randomUUID();
    this.store.update((draft) => {
      draft.sessions.push({ token, user_id: user.id, created_at: new Date().toISOString() });
      draft.sessions.push({ token, user_id: user.id, created_at: new Date().toISOString() });
      return draft;
    });

    return { token, user: publicUser(user) };
  }

  logout(sessionIdentifier) {
  logout(sessionIdentifier) {
    this.store.update((draft) => {
      draft.sessions = draft.sessions.filter((entry) => (
        entry.token !== sessionIdentifier && entry.user_id !== sessionIdentifier
      ));
      draft.sessions = draft.sessions.filter((entry) => (
        entry.token !== sessionIdentifier && entry.user_id !== sessionIdentifier
      ));
      return draft;
    });
  }

  getUserByToken(token) {
    if (!token) return null;
    if (!token) return null;
    const state = this.store.getState();
    const session = state.sessions.find((entry) => entry.token === token);
    if (!session) return null;
    return state.users.find((user) => user.id === session.user_id) || null;
  }

  listProjectsForUser(userId) {
    const state = this.store.getState();
    return state.projects
      .filter((project) => this.getMembership(state, project.id, userId))
      .map((project) => this.enrichProject(state, project, userId));
  }

  getProjectByIdForUser(projectId, userId) {
    const state = this.store.getState();
    const project = state.projects.find((entry) => entry.id === projectId);
    if (!project) throw this.notFound('Projekt nicht gefunden.');
    if (!this.getMembership(state, projectId, userId)) {
      throw this.forbidden('Kein Zugriff auf dieses Projekt.');
    }
    return this.enrichProject(state, project, userId);
    if (!session) return null;
    return state.users.find((user) => user.id === session.user_id) || null;
  }

  listProjectsForUser(userId) {
    const state = this.store.getState();
    return state.projects
      .filter((project) => this.getMembership(state, project.id, userId))
      .map((project) => this.enrichProject(state, project, userId));
  }

  getProjectByIdForUser(projectId, userId) {
    const state = this.store.getState();
    const project = state.projects.find((entry) => entry.id === projectId);
    if (!project) throw this.notFound('Projekt nicht gefunden.');
    if (!this.getMembership(state, projectId, userId)) {
      throw this.forbidden('Kein Zugriff auf dieses Projekt.');
    }
    return this.enrichProject(state, project, userId);
  }

  createProject(currentUser, payload) {
    if (!payload.name) throw this.badRequest('Projektname ist erforderlich.');
    const state = this.store.getState();
    const members = Array.isArray(payload.members) ? payload.members : [];
    this.validateMembers(state, members);
    if (!payload.name) throw this.badRequest('Projektname ist erforderlich.');
    const state = this.store.getState();
    const members = Array.isArray(payload.members) ? payload.members : [];
    this.validateMembers(state, members);

    const project = {
      id: crypto.randomUUID(),
      name: payload.name,
      description: payload.description || '',
      owner_id: currentUser.id,
      created_at: new Date().toISOString(),
      deadline: payload.deadline || null,
      owner_id: currentUser.id,
      created_at: new Date().toISOString(),
      deadline: payload.deadline || null,
    };

    this.store.update((draft) => {
      draft.projects.push(project);
      draft.project_members.push({
        project_id: project.id,
        user_id: currentUser.id,
        role: ROLE_LEVELS.admin,
        joined_at: new Date().toISOString(),
      });

      members
        .filter((member) => member.userId && member.userId !== currentUser.id)
        .forEach((member) => {
          draft.project_members.push({
            project_id: project.id,
            user_id: member.userId,
            role: this.roleToLevel(member.role || 'guest'),
            joined_at: new Date().toISOString(),
          });
        });
      draft.project_members.push({
        project_id: project.id,
        user_id: currentUser.id,
        role: ROLE_LEVELS.admin,
        joined_at: new Date().toISOString(),
      });

      members
        .filter((member) => member.userId && member.userId !== currentUser.id)
        .forEach((member) => {
          draft.project_members.push({
            project_id: project.id,
            user_id: member.userId,
            role: this.roleToLevel(member.role || 'guest'),
            joined_at: new Date().toISOString(),
          });
        });
      return draft;
    });

    return this.getProjectByIdForUser(project.id, currentUser.id);
  }

  updateProject(currentUser, projectId, payload) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');

    this.store.update((draft) => {
      const target = draft.projects.find((entry) => entry.id === projectId);
      if (payload.name !== undefined) target.name = payload.name || target.name;
      if (payload.description !== undefined) target.description = payload.description;
      if (payload.deadline !== undefined) target.deadline = payload.deadline || null;
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  deleteProject(currentUser, projectId) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');

    this.store.update((draft) => {
      const taskIds = draft.tasks.filter((task) => task.project_id === projectId).map((task) => task.id);
      draft.projects = draft.projects.filter((entry) => entry.id !== projectId);
      draft.project_members = draft.project_members.filter((entry) => entry.project_id !== projectId);
      draft.tasks = draft.tasks.filter((entry) => entry.project_id !== projectId);
      draft.task_assignees = draft.task_assignees.filter((entry) => !taskIds.includes(entry.task_id));
      return draft;
    });
  }

  listProjectMembers(currentUser, projectId) {
    this.getProjectByIdForUser(projectId, currentUser.id);
    return this.memberViews(this.store.getState(), projectId);
  }

  addProjectMember(currentUser, projectId, { userId, role = 'guest' }) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
  updateProject(currentUser, projectId, payload) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');

    this.store.update((draft) => {
      const target = draft.projects.find((entry) => entry.id === projectId);
      if (payload.name !== undefined) target.name = payload.name || target.name;
      if (payload.description !== undefined) target.description = payload.description;
      if (payload.deadline !== undefined) target.deadline = payload.deadline || null;
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  deleteProject(currentUser, projectId) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');

    this.store.update((draft) => {
      const taskIds = draft.tasks.filter((task) => task.project_id === projectId).map((task) => task.id);
      draft.projects = draft.projects.filter((entry) => entry.id !== projectId);
      draft.project_members = draft.project_members.filter((entry) => entry.project_id !== projectId);
      draft.tasks = draft.tasks.filter((entry) => entry.project_id !== projectId);
      draft.task_assignees = draft.task_assignees.filter((entry) => !taskIds.includes(entry.task_id));
      return draft;
    });
  }

  listProjectMembers(currentUser, projectId) {
    this.getProjectByIdForUser(projectId, currentUser.id);
    return this.memberViews(this.store.getState(), projectId);
  }

  addProjectMember(currentUser, projectId, { userId, role = 'guest' }) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    const state = this.store.getState();
    this.assertUserExists(state, userId);

    this.store.update((draft) => {
      const existing = draft.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId);
      if (existing) {
        existing.role = this.roleToLevel(role);
      } else {
        draft.project_members.push({
          project_id: projectId,
          user_id: userId,
          role: this.roleToLevel(role),
          joined_at: new Date().toISOString(),
        });
      }
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  updateProjectMember(currentUser, projectId, userId, { role }) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (!role) throw this.badRequest('role ist erforderlich.');

    this.store.update((draft) => {
      const existing = draft.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId);
      if (!existing) throw this.notFound('Projektmitglied nicht gefunden.');
      existing.role = this.roleToLevel(role);
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  deleteProjectMember(currentUser, projectId, userId) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (userId === project.owner.id) {
      throw this.badRequest('Der Projekteigentümer kann nicht entfernt werden.');
    }

    this.store.update((draft) => {
      draft.project_members = draft.project_members.filter((entry) => !(entry.project_id === projectId && entry.user_id === userId));
      draft.task_assignees = draft.task_assignees.filter((assignment) => {
        const task = draft.tasks.find((entry) => entry.id === assignment.task_id);
        return !(assignment.user_id === userId && task?.project_id === projectId);
      });
      return draft;
    });
  }

  listTasksForProject(currentUser, projectId) {
    this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertUserExists(state, userId);

    this.store.update((draft) => {
      const existing = draft.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId);
      if (existing) {
        existing.role = this.roleToLevel(role);
      } else {
        draft.project_members.push({
          project_id: projectId,
          user_id: userId,
          role: this.roleToLevel(role),
          joined_at: new Date().toISOString(),
        });
      }
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  updateProjectMember(currentUser, projectId, userId, { role }) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (!role) throw this.badRequest('role ist erforderlich.');

    this.store.update((draft) => {
      const existing = draft.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId);
      if (!existing) throw this.notFound('Projektmitglied nicht gefunden.');
      existing.role = this.roleToLevel(role);
      return draft;
    });

    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  deleteProjectMember(currentUser, projectId, userId) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (userId === project.owner.id) {
      throw this.badRequest('Der Projekteigentümer kann nicht entfernt werden.');
    }

    this.store.update((draft) => {
      draft.project_members = draft.project_members.filter((entry) => !(entry.project_id === projectId && entry.user_id === userId));
      draft.task_assignees = draft.task_assignees.filter((assignment) => {
        const task = draft.tasks.find((entry) => entry.id === assignment.task_id);
        return !(assignment.user_id === userId && task?.project_id === projectId);
      });
      return draft;
    });
  }

  listTasksForProject(currentUser, projectId) {
    this.getProjectByIdForUser(projectId, currentUser.id);
    const state = this.store.getState();
    const tasks = state.tasks.filter((task) => task.project_id === projectId && !task.parent_id);
    return tasks.map((task) => this.enrichTask(state, task, currentUser.id));
  }
    const tasks = state.tasks.filter((task) => task.project_id === projectId && !task.parent_id);
    return tasks.map((task) => this.enrichTask(state, task, currentUser.id));
  }

  getTaskById(userId, taskId) {
    const state = this.store.getState();
    const task = state.tasks.find((entry) => entry.id === taskId);
    if (!task) throw this.notFound('Task nicht gefunden.');
    this.getProjectByIdForUser(task.project_id, userId);
    return this.enrichTask(state, task, userId);
  }

  listSubtasks(currentUser, taskId) {
    const task = this.getTaskById(currentUser.id, taskId);
    return task.subtasks;
  getTaskById(userId, taskId) {
    const state = this.store.getState();
    const task = state.tasks.find((entry) => entry.id === taskId);
    if (!task) throw this.notFound('Task nicht gefunden.');
    this.getProjectByIdForUser(task.project_id, userId);
    return this.enrichTask(state, task, userId);
  }

  listSubtasks(currentUser, taskId) {
    const task = this.getTaskById(currentUser.id, taskId);
    return task.subtasks;
  }

  createTask(currentUser, projectId, payload) {
    const project = this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'employee');
    if (!payload.title) throw this.badRequest('Task-Titel ist erforderlich.');
    const state = this.store.getState();
    if (!payload.title) throw this.badRequest('Task-Titel ist erforderlich.');
    const state = this.store.getState();

    if (payload.parentTaskId) {
      const parent = state.tasks.find((entry) => entry.id === payload.parentTaskId);
      if (!parent || parent.project_id !== projectId) {
        throw this.badRequest('parentTaskId muss zu einem Task desselben Projekts gehören.');
      const parent = state.tasks.find((entry) => entry.id === payload.parentTaskId);
      if (!parent || parent.project_id !== projectId) {
        throw this.badRequest('parentTaskId muss zu einem Task desselben Projekts gehören.');
      }
    }

    const assigneeIds = Array.isArray(payload.assigneeIds) ? payload.assigneeIds : [];
    assigneeIds.forEach((userId) => this.assertProjectMember(project, userId));

    const assigneeIds = Array.isArray(payload.assigneeIds) ? payload.assigneeIds : [];
    assigneeIds.forEach((userId) => this.assertProjectMember(project, userId));

    const task = {
      id: crypto.randomUUID(),
      project_id: projectId,
      parent_id: payload.parentTaskId || null,
      project_id: projectId,
      parent_id: payload.parentTaskId || null,
      title: payload.title,
      description: payload.description || '',
      priority: Number.isFinite(payload.priority) ? payload.priority : this.priorityToLevel(payload.priority || 'medium'),
      status: payload.status || 'open',
      creator_id: currentUser.id,
      deadline: payload.dueDate || null,
      created_at: new Date().toISOString(),
    };

    this.store.update((draft) => {
      draft.tasks.push(task);
      assigneeIds.forEach((userId) => {
        draft.task_assignees.push({ task_id: task.id, user_id: userId, assigned_at: new Date().toISOString() });
      });
      assigneeIds.forEach((userId) => {
        draft.task_assignees.push({ task_id: task.id, user_id: userId, assigned_at: new Date().toISOString() });
      });
      return draft;
    });

    return this.getTaskById(currentUser.id, task.id);
  }

  updateTask(currentUser, taskId, payload) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    if (payload.assigneeIds) {
      payload.assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));
    }

    this.store.update((draft) => {
      const target = draft.tasks.find((entry) => entry.id === taskId);
      if (!target) throw this.notFound('Task nicht gefunden.');
      if (payload.title !== undefined) target.title = payload.title || target.title;
      if (payload.description !== undefined) target.description = payload.description;
      if (payload.status !== undefined) target.status = payload.status;
      if (payload.priority !== undefined) target.priority = Number.isFinite(payload.priority) ? payload.priority : this.priorityToLevel(payload.priority);
      if (payload.dueDate !== undefined) target.deadline = payload.dueDate || null;
      if (payload.parentTaskId !== undefined) target.parent_id = payload.parentTaskId || null;
      return draft;
    });

    if (payload.assigneeIds) {
      return this.setTaskAssignees(currentUser, taskId, payload.assigneeIds);
    }

    return this.getTaskById(currentUser.id, taskId);
  updateTask(currentUser, taskId, payload) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    if (payload.assigneeIds) {
      payload.assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));
    }

    this.store.update((draft) => {
      const target = draft.tasks.find((entry) => entry.id === taskId);
      if (!target) throw this.notFound('Task nicht gefunden.');
      if (payload.title !== undefined) target.title = payload.title || target.title;
      if (payload.description !== undefined) target.description = payload.description;
      if (payload.status !== undefined) target.status = payload.status;
      if (payload.priority !== undefined) target.priority = Number.isFinite(payload.priority) ? payload.priority : this.priorityToLevel(payload.priority);
      if (payload.dueDate !== undefined) target.deadline = payload.dueDate || null;
      if (payload.parentTaskId !== undefined) target.parent_id = payload.parentTaskId || null;
      return draft;
    });

    if (payload.assigneeIds) {
      return this.setTaskAssignees(currentUser, taskId, payload.assigneeIds);
    }

    return this.getTaskById(currentUser.id, taskId);
  }

  deleteTask(currentUser, taskId) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    const state = this.store.getState();
    const descendants = new Set();
    const visit = (id) => {
      descendants.add(id);
      state.tasks.filter((entry) => entry.parent_id === id).forEach((entry) => visit(entry.id));
    };
    visit(taskId);

    this.store.update((draft) => {
      draft.tasks = draft.tasks.filter((entry) => !descendants.has(entry.id));
      draft.task_assignees = draft.task_assignees.filter((entry) => !descendants.has(entry.task_id));
      return draft;
    });
  deleteTask(currentUser, taskId) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    const state = this.store.getState();
    const descendants = new Set();
    const visit = (id) => {
      descendants.add(id);
      state.tasks.filter((entry) => entry.parent_id === id).forEach((entry) => visit(entry.id));
    };
    visit(taskId);

    this.store.update((draft) => {
      draft.tasks = draft.tasks.filter((entry) => !descendants.has(entry.id));
      draft.task_assignees = draft.task_assignees.filter((entry) => !descendants.has(entry.task_id));
      return draft;
    });
  }

  listTaskAssignees(currentUser, taskId) {
    return this.getTaskById(currentUser.id, taskId).assignees;
  listTaskAssignees(currentUser, taskId) {
    return this.getTaskById(currentUser.id, taskId).assignees;
  }

  addTaskAssignee(currentUser, taskId, { userId }) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    this.assertProjectMember(task.project, userId);
  addTaskAssignee(currentUser, taskId, { userId }) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    this.assertProjectMember(task.project, userId);

    this.store.update((draft) => {
      const exists = draft.task_assignees.find((entry) => entry.task_id === taskId && entry.user_id === userId);
      if (!exists) {
        draft.task_assignees.push({ task_id: taskId, user_id: userId, assigned_at: new Date().toISOString() });
      const exists = draft.task_assignees.find((entry) => entry.task_id === taskId && entry.user_id === userId);
      if (!exists) {
        draft.task_assignees.push({ task_id: taskId, user_id: userId, assigned_at: new Date().toISOString() });
      }
      return draft;
    });

    return this.getTaskById(currentUser.id, taskId);
  }

  removeTaskAssignee(currentUser, taskId, userId) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    this.store.update((draft) => {
      draft.task_assignees = draft.task_assignees.filter((entry) => !(entry.task_id === taskId && entry.user_id === userId));
      return draft;
    });
    return this.getTaskById(currentUser.id, taskId);
  }

  removeTaskAssignee(currentUser, taskId, userId) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    this.store.update((draft) => {
      draft.task_assignees = draft.task_assignees.filter((entry) => !(entry.task_id === taskId && entry.user_id === userId));
      return draft;
    });
  }

  setTaskAssignees(currentUser, taskId, assigneeIds = []) {
    const task = this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));

    this.store.update((draft) => {
      draft.task_assignees = draft.task_assignees.filter((entry) => entry.task_id !== taskId);
      assigneeIds.forEach((userId) => {
        draft.task_assignees.push({ task_id: taskId, user_id: userId, assigned_at: new Date().toISOString() });
      });
      draft.task_assignees = draft.task_assignees.filter((entry) => entry.task_id !== taskId);
      assigneeIds.forEach((userId) => {
        draft.task_assignees.push({ task_id: taskId, user_id: userId, assigned_at: new Date().toISOString() });
      });
      return draft;
    });

    return this.getTaskById(currentUser.id, taskId);
  }

  enrichProject(state, project, currentUserId) {
    const members = this.memberViews(state, project.id);
    const owner = state.users.find((user) => user.id === project.owner_id) || null;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      owner: owner ? publicUser(owner) : null,
      createdAt: project.created_at,
      deadline: project.deadline,
      role: this.levelToRole(this.getMembership(state, project.id, currentUserId)?.role),
      members,
      taskCount: state.tasks.filter((task) => task.project_id === project.id).length,
    };
  }

  memberViews(state, projectId) {
    return state.project_members
      .filter((entry) => entry.project_id === projectId)
      .map((entry) => ({
        role: this.levelToRole(entry.role),
        joinedAt: entry.joined_at,
        user: publicUser(state.users.find((user) => user.id === entry.user_id) || { id: entry.user_id, name: 'Unbekannt', email: '', created_at: null }),
      }));
  }

  enrichTask(state, task, userId) {
    const project = this.enrichProject(state, state.projects.find((entry) => entry.id === task.project_id), userId);
    const subtasks = state.tasks
      .filter((entry) => entry.parent_id === task.id)
      .map((entry) => this.enrichTask(state, entry, userId));
    const assignees = state.task_assignees
      .filter((entry) => entry.task_id === task.id)
      .map((entry) => state.users.find((user) => user.id === entry.user_id))
      .filter(Boolean)
      .map(publicUser);
    const creator = state.users.find((user) => user.id === task.creator_id);

    return {
      id: task.id,
      projectId: task.project_id,
      parentTaskId: task.parent_id,
      title: task.title,
      description: task.description,
      priority: this.levelToPriority(task.priority),
      priorityValue: task.priority,
      status: task.status,
      dueDate: task.deadline,
      createdAt: task.created_at,
      createdBy: creator ? publicUser(creator) : null,
      assignees,
      subtasks,
      project,
    };
  }

  getMembership(state, projectId, userId) {
    return state.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId) || null;
  }

  enrichProject(state, project, currentUserId) {
    const members = this.memberViews(state, project.id);
    const owner = state.users.find((user) => user.id === project.owner_id) || null;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      owner: owner ? publicUser(owner) : null,
      createdAt: project.created_at,
      deadline: project.deadline,
      role: this.levelToRole(this.getMembership(state, project.id, currentUserId)?.role),
      members,
      taskCount: state.tasks.filter((task) => task.project_id === project.id).length,
    };
  }

  memberViews(state, projectId) {
    return state.project_members
      .filter((entry) => entry.project_id === projectId)
      .map((entry) => ({
        role: this.levelToRole(entry.role),
        joinedAt: entry.joined_at,
        user: publicUser(state.users.find((user) => user.id === entry.user_id) || { id: entry.user_id, name: 'Unbekannt', email: '', created_at: null }),
      }));
  }

  enrichTask(state, task, userId) {
    const project = this.enrichProject(state, state.projects.find((entry) => entry.id === task.project_id), userId);
    const subtasks = state.tasks
      .filter((entry) => entry.parent_id === task.id)
      .map((entry) => this.enrichTask(state, entry, userId));
    const assignees = state.task_assignees
      .filter((entry) => entry.task_id === task.id)
      .map((entry) => state.users.find((user) => user.id === entry.user_id))
      .filter(Boolean)
      .map(publicUser);
    const creator = state.users.find((user) => user.id === task.creator_id);

    return {
      id: task.id,
      projectId: task.project_id,
      parentTaskId: task.parent_id,
      title: task.title,
      description: task.description,
      priority: this.levelToPriority(task.priority),
      priorityValue: task.priority,
      status: task.status,
      dueDate: task.deadline,
      createdAt: task.created_at,
      createdBy: creator ? publicUser(creator) : null,
      assignees,
      subtasks,
      project,
    };
  }

  getMembership(state, projectId, userId) {
    return state.project_members.find((entry) => entry.project_id === projectId && entry.user_id === userId) || null;
  }

  assertProjectMember(project, userId) {
    if (!project.members.some((member) => member.user.id === userId)) {
    if (!project.members.some((member) => member.user.id === userId)) {
      throw this.badRequest('Zugeordnete Person ist kein Projektmitglied.');
    }
  }

  assertProjectRole(project, userId, requiredRole) {
    const member = project.members.find((entry) => entry.user.id === userId);
    const role = member?.role || 'guest';
    if (ROLE_LEVELS[role] < ROLE_LEVELS[requiredRole]) {
    const member = project.members.find((entry) => entry.user.id === userId);
    const role = member?.role || 'guest';
    if (ROLE_LEVELS[role] < ROLE_LEVELS[requiredRole]) {
      throw this.forbidden('Unzureichende Berechtigungen.');
    }
  }

  validateMembers(state, members) {
  validateMembers(state, members) {
    const seen = new Set();
    members.forEach((member) => {
      if (!member.userId) throw this.badRequest('userId für Mitglied fehlt.');
      if (seen.has(member.userId)) throw this.badRequest('Mitglied doppelt angegeben.');
      this.assertUserExists(state, member.userId);
      this.roleToLevel(member.role || 'guest');
      if (!member.userId) throw this.badRequest('userId für Mitglied fehlt.');
      if (seen.has(member.userId)) throw this.badRequest('Mitglied doppelt angegeben.');
      this.assertUserExists(state, member.userId);
      this.roleToLevel(member.role || 'guest');
      seen.add(member.userId);
    });
  }

  assertUserExists(state, userId) {
    if (!state.users.some((user) => user.id === userId)) {
      throw this.badRequest('Benutzer nicht gefunden.');
    }
  }

  roleToLevel(role) {
    if (!Object.hasOwn(ROLE_LEVELS, role)) throw this.badRequest('Ungültige Rolle.');
    return ROLE_LEVELS[role];
  }

  levelToRole(level) {
    return Object.entries(ROLE_LEVELS).find(([, value]) => value === level)?.[0] || 'guest';
  }

  priorityToLevel(priority) {
    return { low: 0, medium: 1, high: 2 }[priority] ?? 1;
  }

  levelToPriority(level) {
    return ['low', 'medium', 'high'][level] || 'medium';
    });
  }

  assertUserExists(state, userId) {
    if (!state.users.some((user) => user.id === userId)) {
      throw this.badRequest('Benutzer nicht gefunden.');
    }
  }

  roleToLevel(role) {
    if (!Object.hasOwn(ROLE_LEVELS, role)) throw this.badRequest('Ungültige Rolle.');
    return ROLE_LEVELS[role];
  }

  levelToRole(level) {
    return Object.entries(ROLE_LEVELS).find(([, value]) => value === level)?.[0] || 'guest';
  }

  priorityToLevel(priority) {
    return { low: 0, medium: 1, high: 2 }[priority] ?? 1;
  }

  levelToPriority(level) {
    return ['low', 'medium', 'high'][level] || 'medium';
  }

  badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
  unauthorized(message) { return Object.assign(new Error(message), { status: 401 }); }
  forbidden(message) { return Object.assign(new Error(message), { status: 403 }); }
  notFound(message) { return Object.assign(new Error(message), { status: 404 }); }
  badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
  unauthorized(message) { return Object.assign(new Error(message), { status: 401 }); }
  forbidden(message) { return Object.assign(new Error(message), { status: 403 }); }
  notFound(message) { return Object.assign(new Error(message), { status: 404 }); }
}

module.exports = { StoreService, ROLE_LEVELS };