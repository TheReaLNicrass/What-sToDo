const express = require('express');
const { asyncHandler } = require('../utils/http');

function buildTaskRouter(service) {
  const router = express.Router();

  router.get('/:taskId', asyncHandler(async (req, res) => {
    res.json({ task: await service.getTaskById(req.user.id, req.params.taskId) });
  }));

  router.put('/:taskId', asyncHandler(async (req, res) => {
    res.json({ task: await service.updateTask(req.user, req.params.taskId, req.body || {}) });
  }));

  router.delete('/:taskId', asyncHandler(async (req, res) => {
    await service.deleteTask(req.user, req.params.taskId);
    res.status(204).end();
  }));

  router.get('/:taskId/subtasks', asyncHandler(async (req, res) => {
    res.json({ tasks: await service.listSubtasks(req.user, req.params.taskId) });
  }));

  router.get('/:taskId/assignees', asyncHandler(async (req, res) => {
    res.json({ assignees: await service.listTaskAssignees(req.user, req.params.taskId) });
  }));

  router.post('/:taskId/assignees', asyncHandler(async (req, res) => {
    res.status(201).json({ task: await service.addTaskAssignee(req.user, req.params.taskId, req.body || {}) });
  }));

  router.put('/:taskId/assignees', asyncHandler(async (req, res) => {
    res.json({ task: await service.setTaskAssignees(req.user, req.params.taskId, req.body.assigneeIds || []) });
  }));

  router.delete('/:taskId/assignees/:userId', asyncHandler(async (req, res) => {
    await service.removeTaskAssignee(req.user, req.params.taskId, req.params.userId);
    res.status(204).end();
  }));

  return router;
}

module.exports = { buildTaskRouter };
