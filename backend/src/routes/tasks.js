const express = require('express');
const { asyncHandler } = require('../utils/http');

function buildTaskRouter(service) {
  const router = express.Router();

  router.get('/:taskId', asyncHandler(async (req, res) => {
    const task = service.getTaskById(req.user.id, req.params.taskId);
    res.json({ task });
  }));

  router.put('/:taskId/assignees', asyncHandler(async (req, res) => {
    const task = service.setTaskAssignees(req.user, req.params.taskId, req.body.assigneeIds || []);
    res.json({ task });
  }));

  return router;
}

module.exports = { buildTaskRouter };