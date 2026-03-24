const express = require('express');
const { asyncHandler } = require('../utils/http');

function buildProjectRouter(service) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ projects: await service.listProjectsForUser(req.user.id) });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const project = await service.createProject(req.user, req.body || {});
    res.status(201).json({ project });
  }));

  router.get('/:projectId', asyncHandler(async (req, res) => {
    res.json({ project: await service.getProjectByIdForUser(req.params.projectId, req.user.id) });
  }));

  router.put('/:projectId', asyncHandler(async (req, res) => {
    res.json({ project: await service.updateProject(req.user, req.params.projectId, req.body || {}) });
  }));

  router.delete('/:projectId', asyncHandler(async (req, res) => {
    await service.deleteProject(req.user, req.params.projectId);
    res.status(204).end();
  }));

  router.get('/:projectId/members', asyncHandler(async (req, res) => {
    res.json({ members: await service.listProjectMembers(req.user, req.params.projectId) });
  }));

  router.post('/:projectId/members', asyncHandler(async (req, res) => {
    res.status(201).json({ project: await service.addProjectMember(req.user, req.params.projectId, req.body || {}) });
  }));

  router.put('/:projectId/members/:userId', asyncHandler(async (req, res) => {
    res.json({ project: await service.updateProjectMember(req.user, req.params.projectId, req.params.userId, req.body || {}) });
  }));

  router.delete('/:projectId/members/:userId', asyncHandler(async (req, res) => {
    await service.deleteProjectMember(req.user, req.params.projectId, req.params.userId);
    res.status(204).end();
  }));

  router.get('/:projectId/tasks', asyncHandler(async (req, res) => {
    res.json({ tasks: await service.listTasksForProject(req.user, req.params.projectId) });
  }));

  router.post('/:projectId/tasks', asyncHandler(async (req, res) => {
    res.status(201).json({ task: await service.createTask(req.user, req.params.projectId, req.body || {}) });
  }));

  return router;
}

module.exports = { buildProjectRouter };
