const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'tasks.json');

const seedTasks = [
  {
    id: randomUUID(),
    title: 'Website-Relaunch',
    description: 'Obergruppe für den Relaunch inklusive Design, Content und Technik.',
    assignee: 'Anna',
    priority: 'high',
    status: 'wip',
    startDate: '2026-03-10',
    deadline: '2026-03-28',
    finished: false,
    children: [
      {
        id: randomUUID(),
        title: 'Design-System abstimmen',
        description: 'Farben, Buttons, Karten und mobile Layouts definieren.',
        assignee: 'Clara',
        priority: 'high',
        status: 'review',
        startDate: '2026-03-11',
        deadline: '2026-03-20',
        finished: false,
        children: []
      }
    ]
  }
];

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(seedTasks, null, 2), 'utf-8');
  }
}

async function readTasks() {
  await ensureStore();
  const raw = await fs.readFile(dataFile, 'utf-8');
  return JSON.parse(raw);
}

async function writeTasks(tasks) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(tasks, null, 2), 'utf-8');
}

function normalizeTask(input, existing = null) {
  return {
    id: input.id || existing?.id || randomUUID(),
    title: String(input.title || existing?.title || '').trim(),
    description: String(input.description || existing?.description || '').trim(),
    assignee: String(input.assignee || existing?.assignee || 'Nicht zugewiesen').trim(),
    priority: input.priority || existing?.priority || 'medium',
    status: input.status || existing?.status || 'new',
    startDate: input.startDate || existing?.startDate || '',
    deadline: input.deadline || existing?.deadline || '',
    finished: Boolean(input.finished ?? existing?.finished ?? false),
    children: Array.isArray(input.children) ? input.children.map(child => normalizeTask(child)) : (existing?.children || [])
  };
}

function findTask(id, list) {
  for (const task of list) {
    if (task.id === id) return task;
    const found = findTask(id, task.children || []);
    if (found) return found;
  }
  return null;
}

function removeTask(id, list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list.splice(i, 1)[0];
    }
    const removed = removeTask(id, list[i].children || []);
    if (removed) return removed;
  }
  return null;
}

function countSummary(list) {
  const flat = [];
  const walk = (items) => {
    for (const item of items) {
      flat.push(item);
      walk(item.children || []);
    }
  };
  walk(list);

  const overdue = flat.filter(t => !t.finished && t.deadline && t.deadline < new Date().toISOString().slice(0, 10)).length;
  return {
    total: flat.length,
    active: flat.filter(t => !t.finished).length,
    done: flat.filter(t => t.finished).length,
    overdue,
    groups: list.length
  };
}

router.get('/', async (_req, res) => {
  const tasks = await readTasks();
  res.json(tasks);
});

router.get('/summary', async (_req, res) => {
  const tasks = await readTasks();
  res.json(countSummary(tasks));
});

router.post('/', async (req, res) => {
  const tasks = await readTasks();
  const parentId = req.body.parentId || 'root';
  const newTask = normalizeTask(req.body);

  if (!newTask.title) return res.status(400).json({ error: 'title ist erforderlich' });

  if (parentId === 'root') {
    tasks.push(newTask);
  } else {
    const parent = findTask(parentId, tasks);
    if (!parent) return res.status(404).json({ error: 'Parent Task nicht gefunden' });
    parent.children ||= [];
    parent.children.push(newTask);
  }

  await writeTasks(tasks);
  res.status(201).json(newTask);
});

router.put('/:id', async (req, res) => {
  const tasks = await readTasks();
  const existing = removeTask(req.params.id, tasks);

  if (!existing) return res.status(404).json({ error: 'Task nicht gefunden' });

  const parentId = req.body.parentId || 'root';
  const updated = normalizeTask({ ...req.body, id: req.params.id }, existing);
  if (!updated.title) return res.status(400).json({ error: 'title ist erforderlich' });

  if (parentId === 'root') {
    tasks.push(updated);
  } else {
    const parent = findTask(parentId, tasks);
    if (!parent) {
      tasks.push(updated);
    } else {
      parent.children ||= [];
      parent.children.push(updated);
    }
  }

  await writeTasks(tasks);
  res.json(updated);
});

router.patch('/:id/toggle', async (req, res) => {
  const tasks = await readTasks();
  const task = findTask(req.params.id, tasks);
  if (!task) return res.status(404).json({ error: 'Task nicht gefunden' });
  task.finished = !task.finished;
  await writeTasks(tasks);
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  const tasks = await readTasks();
  const removed = removeTask(req.params.id, tasks);
  if (!removed) return res.status(404).json({ error: 'Task nicht gefunden' });
  await writeTasks(tasks);
  res.status(204).end();
});

module.exports = router;
