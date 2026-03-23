const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');
const { ROLE_LEVELS } = require('./storeService');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
  };
}

class DatabaseService {
  async query(text, params = []) {
    return db.query(text, params);
  }

  async listUsers() {
    const result = await this.query('SELECT id, name, email, created_at FROM users ORDER BY created_at ASC');
    return result.rows.map(publicUser);
  }

  async getUserById(userId) {
    const result = await this.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) throw this.notFound('Benutzer nicht gefunden.');
    return publicUser(result.rows[0]);
  }

  async register({ name, email, password }) {
    if (!name || !email || !password) throw this.badRequest('name, email und password sind erforderlich.');
    const existing = await this.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows[0]) throw this.badRequest('E-Mail ist bereits registriert.');

    const hash = await bcrypt.hash(password, 10);
    const result = await this.query(
      'INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, created_at',
      [crypto.randomUUID(), name, email.toLowerCase(), hash],
    );
    return publicUser(result.rows[0]);
  }

  async login({ email, password }) {
    const result = await this.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [String(email || '')]);
    const user = result.rows[0];
    if (!user) throw this.unauthorized('Ungültige Zugangsdaten.');
    const valid = await bcrypt.compare(password || '', user.password || '');
    if (!valid) throw this.unauthorized('Ungültige Zugangsdaten.');

    return publicUser(user);
  }

  async logout() {
    return null;
  }

  async listProjectsForUser(userId) {
    const result = await this.query(
      `SELECT p.id
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1
       ORDER BY COALESCE(p.deadline, p.created_at) ASC, p.created_at ASC`,
      [userId],
    );
    return Promise.all(result.rows.map((row) => this.getProjectByIdForUser(row.id, userId)));
  }

  async getProjectByIdForUser(projectId, userId) {
    const projectResult = await this.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const project = projectResult.rows[0];
    if (!project) throw this.notFound('Projekt nicht gefunden.');

    const membershipResult = await this.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );
    const membership = membershipResult.rows[0];
    if (!membership) throw this.forbidden('Kein Zugriff auf dieses Projekt.');

    return this.enrichProject(project, membership.role, userId);
  }

  async createProject(currentUser, payload) {
    if (!payload.name) throw this.badRequest('Projektname ist erforderlich.');
    const members = Array.isArray(payload.members) ? payload.members : [];
    await this.validateMembers(members);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const projectId = crypto.randomUUID();
      await client.query(
        'INSERT INTO projects (id, name, description, owner_id, created_at, deadline) VALUES ($1, $2, $3, $4, NOW(), $5)',
        [projectId, payload.name, payload.description || '', currentUser.id, payload.deadline || null],
      );
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
        [projectId, currentUser.id, ROLE_LEVELS.admin],
      );
      for (const member of members.filter((entry) => entry.userId && entry.userId !== currentUser.id)) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [projectId, member.userId, this.roleToLevel(member.role || 'guest')],
        );
      }
      await client.query('COMMIT');
      return this.getProjectByIdForUser(projectId, currentUser.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProject(currentUser, projectId, payload) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    await this.query(
      `UPDATE projects
       SET name = COALESCE($2, name),
           description = CASE WHEN $3::text IS NULL THEN description ELSE $3 END,
           deadline = CASE WHEN $4::timestamptz IS NULL AND $5 = FALSE THEN deadline ELSE $4 END
       WHERE id = $1`,
      [projectId, payload.name || null, payload.description ?? null, payload.deadline || null, Object.hasOwn(payload, 'deadline')],
    );
    if (payload.description !== undefined && payload.description === null) {
      await this.query('UPDATE projects SET description = NULL WHERE id = $1', [projectId]);
    }
    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  async deleteProject(currentUser, projectId) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    await this.query('DELETE FROM projects WHERE id = $1', [projectId]);
  }

  async listProjectMembers(currentUser, projectId) {
    await this.getProjectByIdForUser(projectId, currentUser.id);
    return this.memberViews(projectId);
  }

  async addProjectMember(currentUser, projectId, { userId, role = 'guest' }) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    await this.assertUserExists(userId);
    await this.query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, userId, this.roleToLevel(role)],
    );
    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  async updateProjectMember(currentUser, projectId, userId, { role }) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (!role) throw this.badRequest('role ist erforderlich.');
    const result = await this.query('UPDATE project_members SET role = $3 WHERE project_id = $1 AND user_id = $2 RETURNING user_id', [projectId, userId, this.roleToLevel(role)]);
    if (!result.rows[0]) throw this.notFound('Projektmitglied nicht gefunden.');
    return this.getProjectByIdForUser(projectId, currentUser.id);
  }

  async deleteProjectMember(currentUser, projectId, userId) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'admin');
    if (userId === project.owner.id) throw this.badRequest('Der Projekteigentümer kann nicht entfernt werden.');
    await this.query('DELETE FROM task_assignees ta USING tasks t WHERE ta.task_id = t.id AND t.project_id = $1 AND ta.user_id = $2', [projectId, userId]);
    await this.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  }

  async listTasksForProject(currentUser, projectId) {
    await this.getProjectByIdForUser(projectId, currentUser.id);
    const result = await this.query('SELECT id FROM tasks WHERE project_id = $1 AND parent_id IS NULL ORDER BY created_at ASC', [projectId]);
    return Promise.all(result.rows.map((row) => this.getTaskById(currentUser.id, row.id)));
  }

  async getTaskById(userId, taskId) {
    const result = await this.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    const task = result.rows[0];
    if (!task) throw this.notFound('Task nicht gefunden.');
    await this.getProjectByIdForUser(task.project_id, userId);
    return this.enrichTask(task, userId);
  }

  async listSubtasks(currentUser, taskId) {
    return (await this.getTaskById(currentUser.id, taskId)).subtasks;
  }

  async createTask(currentUser, projectId, payload) {
    const project = await this.getProjectByIdForUser(projectId, currentUser.id);
    this.assertProjectRole(project, currentUser.id, 'employee');
    if (!payload.title) throw this.badRequest('Task-Titel ist erforderlich.');

    if (payload.parentTaskId) {
      const parentResult = await this.query('SELECT id, project_id FROM tasks WHERE id = $1', [payload.parentTaskId]);
      const parent = parentResult.rows[0];
      if (!parent || parent.project_id !== projectId) throw this.badRequest('parentTaskId muss zu einem Task desselben Projekts gehören.');
    }

    const assigneeIds = Array.isArray(payload.assigneeIds) ? payload.assigneeIds : [];
    assigneeIds.forEach((userId) => this.assertProjectMember(project, userId));

    const taskId = crypto.randomUUID();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO tasks (id, project_id, parent_id, title, description, priority, status, creator_id, deadline, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [taskId, projectId, payload.parentTaskId || null, payload.title, payload.description || '', this.priorityToLevel(payload.priority || 'medium'), this.normalizeStatus(payload.status || 'open'), currentUser.id, payload.dueDate || null],
      );
      for (const userId of assigneeIds) {
        await client.query('INSERT INTO task_assignees (task_id, user_id, assigned_at) VALUES ($1, $2, NOW())', [taskId, userId]);
      }
      await client.query('COMMIT');
      return this.getTaskById(currentUser.id, taskId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTask(currentUser, taskId, payload) {
    const task = await this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    if (payload.assigneeIds) payload.assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));
    if (payload.parentTaskId) {
      const parent = await this.getTaskById(currentUser.id, payload.parentTaskId);
      if (parent.projectId !== task.projectId || payload.parentTaskId === taskId) throw this.badRequest('Ungültige Parent-Task.');
    }

    await this.query(
      `UPDATE tasks
       SET title = COALESCE($2, title),
           description = CASE WHEN $3::text IS NULL THEN description ELSE $3 END,
           priority = COALESCE($4, priority),
           status = COALESCE($5, status),
           deadline = CASE WHEN $6::timestamptz IS NULL AND $8 = FALSE THEN deadline ELSE $6 END,
           parent_id = CASE WHEN $7::uuid IS NULL AND $9 = FALSE THEN parent_id ELSE $7 END
       WHERE id = $1`,
      [taskId, payload.title || null, payload.description ?? null, payload.priority !== undefined ? this.priorityToLevel(payload.priority) : null, payload.status !== undefined ? this.normalizeStatus(payload.status) : null, payload.dueDate || null, payload.parentTaskId || null, Object.hasOwn(payload, 'dueDate'), Object.hasOwn(payload, 'parentTaskId')],
    );
    if (payload.assigneeIds) return this.setTaskAssignees(currentUser, taskId, payload.assigneeIds);
    return this.getTaskById(currentUser.id, taskId);
  }

  async deleteTask(currentUser, taskId) {
    const task = await this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    await this.query(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM tasks WHERE id = $1
         UNION ALL
         SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
       )
       DELETE FROM tasks WHERE id IN (SELECT id FROM descendants)`,
      [taskId],
    );
  }

  async listTaskAssignees(currentUser, taskId) {
    return (await this.getTaskById(currentUser.id, taskId)).assignees;
  }

  async addTaskAssignee(currentUser, taskId, { userId }) {
    const task = await this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    this.assertProjectMember(task.project, userId);
    await this.query(
      'INSERT INTO task_assignees (task_id, user_id, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT (task_id, user_id) DO NOTHING',
      [taskId, userId],
    );
    return this.getTaskById(currentUser.id, taskId);
  }

  async removeTaskAssignee(currentUser, taskId, userId) {
    const task = await this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    await this.query('DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2', [taskId, userId]);
  }

  async setTaskAssignees(currentUser, taskId, assigneeIds = []) {
    const task = await this.getTaskById(currentUser.id, taskId);
    this.assertProjectRole(task.project, currentUser.id, 'employee');
    assigneeIds.forEach((userId) => this.assertProjectMember(task.project, userId));
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
      for (const userId of assigneeIds) {
        await client.query('INSERT INTO task_assignees (task_id, user_id, assigned_at) VALUES ($1, $2, NOW())', [taskId, userId]);
      }
      await client.query('COMMIT');
      return this.getTaskById(currentUser.id, taskId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async enrichProject(project, roleLevel, currentUserId) {
    const [members, ownerResult, countResult] = await Promise.all([
      this.memberViews(project.id),
      this.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [project.owner_id]),
      this.query('SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1', [project.id]),
    ]);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      owner: ownerResult.rows[0] ? publicUser(ownerResult.rows[0]) : null,
      createdAt: project.created_at,
      deadline: project.deadline,
      role: this.levelToRole(roleLevel),
      members,
      taskCount: countResult.rows[0].count,
    };
  }

  async memberViews(projectId) {
    const result = await this.query(
      `SELECT pm.role, pm.joined_at, u.id, u.name, u.email, u.created_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [projectId],
    );
    return result.rows.map((row) => ({ role: this.levelToRole(row.role), joinedAt: row.joined_at, user: publicUser(row) }));
  }

  async enrichTask(task, userId) {
    const [project, subtasksResult, assigneesResult, creatorResult] = await Promise.all([
      this.getProjectByIdForUser(task.project_id, userId),
      this.query('SELECT * FROM tasks WHERE parent_id = $1 ORDER BY created_at ASC', [task.id]),
      this.query(
        `SELECT u.id, u.name, u.email, u.created_at
         FROM task_assignees ta
         JOIN users u ON u.id = ta.user_id
         WHERE ta.task_id = $1
         ORDER BY ta.assigned_at ASC`,
        [task.id],
      ),
      this.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [task.creator_id]),
    ]);
    const subtasks = await Promise.all(subtasksResult.rows.map((row) => this.enrichTask(row, userId)));
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
      createdBy: creatorResult.rows[0] ? publicUser(creatorResult.rows[0]) : null,
      assignees: assigneesResult.rows.map(publicUser),
      subtasks,
      project,
    };
  }

  async validateMembers(members) {
    const seen = new Set();
    for (const member of members) {
      if (!member.userId) throw this.badRequest('userId für Mitglied fehlt.');
      if (seen.has(member.userId)) throw this.badRequest('Mitglied doppelt angegeben.');
      await this.assertUserExists(member.userId);
      this.roleToLevel(member.role || 'guest');
      seen.add(member.userId);
    }
  }

  async assertUserExists(userId) {
    const result = await this.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) throw this.badRequest('Benutzer nicht gefunden.');
  }

  assertProjectMember(project, userId) {
    if (!project.members.some((member) => member.user.id === userId)) throw this.badRequest('Zugeordnete Person ist kein Projektmitglied.');
  }

  assertProjectRole(project, userId, requiredRole) {
    const member = project.members.find((entry) => entry.user.id === userId);
    const role = member?.role || 'guest';
    if (ROLE_LEVELS[role] < ROLE_LEVELS[requiredRole]) throw this.forbidden('Unzureichende Berechtigungen.');
  }

  roleToLevel(role) {
    if (!Object.hasOwn(ROLE_LEVELS, role)) throw this.badRequest('Ungültige Rolle.');
    return ROLE_LEVELS[role];
  }
  levelToRole(level) { return Object.entries(ROLE_LEVELS).find(([, value]) => value === level)?.[0] || 'guest'; }

  normalizeStatus(status) {
    const normalized = status === 'todo' ? 'open' : status;
    if (!['open', 'in_progress', 'done'].includes(normalized)) {
      throw this.badRequest('Ungültiger Status. Erlaubt sind open, in_progress, done.');
    }
    return normalized;
  }

  priorityToLevel(priority) { return { low: 0, medium: 1, high: 2 }[priority] ?? 1; }
  levelToPriority(level) { return ['low', 'medium', 'high'][level] || 'medium'; }
  badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
  unauthorized(message) { return Object.assign(new Error(message), { status: 401 }); }
  forbidden(message) { return Object.assign(new Error(message), { status: 403 }); }
  notFound(message) { return Object.assign(new Error(message), { status: 404 }); }
}

module.exports = { DatabaseService };