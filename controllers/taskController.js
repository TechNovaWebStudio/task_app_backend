const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { logActivity, createNotification } = require('../services/notificationService');

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'dueTime', 'priority', 'status', 'title'];

const buildFilter = (query, userId) => {
  const filter = { userId, isArchived: false };

  if (query.search) {
    filter.$or = [
      { title: new RegExp(query.search, 'i') },
      { description: new RegExp(query.search, 'i') },
      { tags: new RegExp(query.search, 'i') }
    ];
  }

  // Handle Date and Status via dates array
  let dateCond = null;
  let statusCond = null;

  if (query.dateFrom || query.dateTo) {
    dateCond = {};
    if (query.dateFrom) dateCond.$gte = query.dateFrom;
    if (query.dateTo) dateCond.$lte = query.dateTo;
  } else if (query.date) {
    dateCond = query.date;
  }

  if (query.status === 'completed' || query.status === 'non_completed') {
    statusCond = query.status === 'completed';
  }

  if (dateCond && statusCond !== null) {
    filter.dates = { $elemMatch: { date: dateCond, completed: statusCond } };
  } else if (dateCond) {
    filter.dates = { $elemMatch: { date: dateCond } };
  } else if (statusCond !== null) {
    filter.dates = { $elemMatch: { completed: statusCond } };
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

// Normalization helper for dates and tags
const normalizeTaskData = (data, existingTask = null) => {
  const result = { ...data };
  
  if (result.dates && Array.isArray(result.dates)) {
    // Remove duplicates and sort string dates, then map to objects
    const uniqueDates = [...new Set(result.dates.filter(d => typeof d === 'string'))].sort();
    
    result.dates = uniqueDates.map(dateStr => {
      let completed = false;
      if (existingTask && existingTask.dates) {
        // Preserve completion status if date already existed
        const existingDateObj = existingTask.dates.find(d => 
          (typeof d === 'string' ? d : d.date) === dateStr
        );
        if (existingDateObj && existingDateObj.completed) {
          completed = true;
        } else if (existingTask.completedDates && existingTask.completedDates.includes(dateStr)) {
          completed = true;
        }
      }
      return { date: dateStr, completed };
    });
  } else if (result.dueDate && (!result.dates || result.dates.length === 0)) {
    const d = new Date(result.dueDate);
    if (!isNaN(d)) {
      result.dates = [{ date: d.toISOString().split('T')[0], completed: false }];
    }
  }
  
  if (result.tags && Array.isArray(result.tags)) {
    result.tags = [...new Set(result.tags.map(t => t.trim()).filter(t => t))];
  }
  return result;
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const taskData = normalizeTaskData(req.body);
    const task = await Task.create({ ...taskData, userId: req.user._id });

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
    const existingTask = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingTask) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    const taskData = normalizeTaskData(req.body, existingTask);
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...taskData },
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
    const { date } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    if (date && task.dates && task.dates.length > 0) {
      const dateObj = task.dates.find(d => d.date === date);
      if (dateObj) {
        dateObj.completed = true;
      }
    } else if (task.dates && task.dates.length > 0) {
      task.dates.forEach(d => { d.completed = true; });
    }
    
    if (task.dates && task.dates.every(d => d.completed)) {
      task.status = 'completed';
      task.completedAt = new Date();
    }
    await task.save();

    await logActivity({ userId: req.user._id, action: 'TASK_COMPLETED', description: `Completed task: ${task.title}`, taskId: task._id, req });
    return successResponse(res, { message: 'Task marked as completed', data: task });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/pending
const pendingTask = async (req, res, next) => {
  try {
    const { date } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    if (date && task.dates && task.dates.length > 0) {
      const dateObj = task.dates.find(d => d.date === date);
      if (dateObj) {
        dateObj.completed = false;
      }
    } else if (task.dates && task.dates.length > 0) {
      task.dates.forEach(d => { d.completed = false; });
    }
    
    task.status = 'non_completed';
    task.completedAt = null;
    await task.save();
    
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
