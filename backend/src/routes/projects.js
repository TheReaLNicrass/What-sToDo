const express = require('express');
const { asyncHandler } = require('../utils/http');

function buildProjectRouter(service) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ projects: service.listProjectsForUser(req.user.id) });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const project = service.createProject(req.user, req.body || {});
    res.status(201).json({ project });
  }));

  router.get('/:projectId', asyncHandler(async (req, res) => {
    const project = service.getProjectByIdForUser(req.params.projectId, req.user.id);
    res.json({ project });
  }));

  router.get('/:projectId/tasks', asyncHandler(async (req, res) => {
    const tasks = service.listTasksForProject(req.user, req.params.projectId);
    res.json({ tasks });
  }));

  router.post('/:projectId/tasks', asyncHandler(async (req, res) => {
    const task = service.createTask(req.user, req.params.projectId, req.body || {});
    res.status(201).json({ task });
  }));

  router.post('/:projectId/members', asyncHandler(async (req, res) => {
    const project = service.addProjectMember(req.user, req.params.projectId, req.body || {});
    res.status(201).json({ project });
  }));

  return router;
}

module.exports = { buildProjectRouter };