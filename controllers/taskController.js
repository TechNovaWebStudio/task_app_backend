const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { logActivity, createNotification } = require('../services/notificationService');

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'];

const buildFilter = (query, userId) => {
  const filter = { userId, isArchived: false };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = new RegExp(query.category, 'i');

  if (query.search) {
    filter.$or = [
      { title: new RegExp(query.search, 'i') },
      { description: new RegExp(query.search, 'i') },
      { category: new RegExp(query.search, 'i') },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    filter.dueDate = {};
    if (query.dateFrom) filter.dueDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.dueDate.$lte = new Date(query.dateTo);
  }

  if (query.month && query.year) {
    const m = parseInt(query.month, 10) - 1;
    const y = parseInt(query.year, 10);
    filter.dueDate = {
      $gte: new Date(y, m, 1),
      $lte: new Date(y, m + 1, 0, 23, 59, 59),
    };
  }

  if (query.date) {
    const d = new Date(query.date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.dueDate = { $gte: d, $lt: next };
  }

  return filter;
};

// GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = buildFilter(req.query, req.user._id);

    const sortField = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean(),
      Task.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: tasks,
      meta: buildMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    return successResponse(res, { data: task });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, userId: req.user._id });

    await logActivity({ userId: req.user._id, action: 'TASK_CREATED', description: `Created task: ${task.title}`, taskId: task._id, req });
    await createNotification({ userId: req.user._id, title: 'Task Created', message: `Task "${task.title}" has been created`, type: 'task', taskId: task._id });

    return successResponse(res, { message: 'Task created successfully', data: task, statusCode: 201 });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    await logActivity({ userId: req.user._id, action: 'TASK_UPDATED', description: `Updated task: ${task.title}`, taskId: task._id, req });

    return successResponse(res, { message: 'Task updated successfully', data: task });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    await logActivity({ userId: req.user._id, action: 'TASK_DELETED', description: `Deleted task: ${task.title}`, req });
    await createNotification({ userId: req.user._id, title: 'Task Deleted', message: `Task "${task.title}" has been deleted`, type: 'warning' });

    return successResponse(res, { message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/complete
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    await logActivity({ userId: req.user._id, action: 'TASK_COMPLETED', description: `Completed task: ${task.title}`, taskId: task._id, req });
    await createNotification({ userId: req.user._id, title: 'Task Completed! 🎉', message: `You completed "${task.title}"`, type: 'success', taskId: task._id });

    return successResponse(res, { message: 'Task marked as completed', data: task });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/pending
const pendingTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'pending', completedAt: null },
      { new: true }
    );
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    return successResponse(res, { message: 'Task marked as pending', data: task });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/archive
const archiveTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isArchived: true },
      { new: true }
    );
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    await logActivity({ userId: req.user._id, action: 'TASK_ARCHIVED', description: `Archived task: ${task.title}`, taskId: task._id, req });
    return successResponse(res, { message: 'Task archived', data: task });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/bulk-delete
const bulkDeleteTasks = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, { message: 'No task IDs provided', statusCode: 400 });
    }
    const result = await Task.deleteMany({ _id: { $in: ids }, userId: req.user._id });
    await logActivity({ userId: req.user._id, action: 'BULK_DELETE', description: `Bulk deleted ${result.deletedCount} tasks`, req });
    return successResponse(res, { message: `${result.deletedCount} tasks deleted` });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/bulk-complete
const bulkCompleteTasks = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, { message: 'No task IDs provided', statusCode: 400 });
    }
    const result = await Task.updateMany(
      { _id: { $in: ids }, userId: req.user._id },
      { status: 'completed', completedAt: new Date() }
    );
    await logActivity({ userId: req.user._id, action: 'BULK_COMPLETE', description: `Bulk completed ${result.modifiedCount} tasks`, req });
    return successResponse(res, { message: `${result.modifiedCount} tasks completed` });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, completeTask, pendingTask, archiveTask, bulkDeleteTasks, bulkCompleteTasks };
