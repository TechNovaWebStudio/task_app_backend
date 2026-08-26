const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { logActivity, createNotification } = require('../services/notificationService');
const crypto = require('crypto');

const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'date', 'time', 'priority', 'status', 'title'];

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildFilter = (query, userId) => {
  const filter = { userId, isArchived: false };

  if (query.search) {
    filter.$or = [
      { title: new RegExp(query.search, 'i') },
      { description: new RegExp(query.search, 'i') },
      { tags: new RegExp(query.search, 'i') }
    ];
  }

  if (query.month && query.year) {
    const m = String(query.month).padStart(2, '0');
    const y = String(query.year);
    filter.date = new RegExp(`^${y}-${m}`);
  } else if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = query.dateFrom;
    if (query.dateTo) filter.date.$lte = query.dateTo;
  } else if (query.date) {
    filter.date = query.date;
  }

  if (query.status === 'completed' || query.status === 'non_completed') {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  return filter;
};

// GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = buildFilter(req.query, req.user._id);

    const sortField = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;

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

// GET /api/tasks/series/:seriesId
const getSeries = async (req, res, next) => {
  try {
    const tasks = await Task.find({ seriesId: req.params.seriesId, userId: req.user._id, isArchived: false }).sort({ date: 1 }).lean();
    return successResponse(res, { data: tasks });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, description, category, priority, dates, tags } = req.body;
    if (!title || !title.trim()) {
      return errorResponse(res, { message: 'Task title is required', statusCode: 400 });
    }

    const seriesId = crypto.randomUUID();
    
    let rawDates = dates;
    if (!rawDates || !Array.isArray(rawDates) || rawDates.length === 0) {
      const todayStr = getTodayString();
      rawDates = [{ date: req.body.dueDate || todayStr, time: req.body.dueTime || '' }];
    }

    // Filter valid & deduplicate dates (duplicate date protection)
    const uniqueDatesMap = new Map();
    rawDates.forEach(d => {
      const dateStr = typeof d === 'string' ? d : d?.date;
      const timeStr = typeof d === 'object' ? (d.time || '') : '';
      if (dateStr && !uniqueDatesMap.has(dateStr)) {
        uniqueDatesMap.set(dateStr, timeStr);
      }
    });

    if (uniqueDatesMap.size === 0) {
      return errorResponse(res, { message: 'At least one valid date must be selected', statusCode: 400 });
    }

    const documents = Array.from(uniqueDatesMap.entries()).map(([dateStr, timeStr]) => ({
      title: title.trim(),
      description: description || '',
      category: category || 'Personal',
      priority: priority || 'medium',
      tags: Array.isArray(tags) ? tags : [],
      date: dateStr,
      time: timeStr,
      seriesId,
      userId: req.user._id,
      status: 'non_completed'
    }));

    const createdTasks = await Task.insertMany(documents);

    await logActivity({ userId: req.user._id, action: 'TASK_CREATED', description: `Created task: ${title} (${createdTasks.length} occurrence${createdTasks.length > 1 ? 's' : ''})`, taskId: createdTasks[0]._id, req });
    await createNotification({ userId: req.user._id, title: 'Task Created', message: `Task "${title}" created for ${createdTasks.length} date(s)`, type: 'task', taskId: createdTasks[0]._id });

    return successResponse(res, { message: 'Task created successfully', data: createdTasks[0], statusCode: 201 });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const existingTask = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingTask) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    const { title, description, category, priority, tags, dates } = req.body;

    if (dates && Array.isArray(dates) && dates.length > 0) {
      const existingSeries = await Task.find({ seriesId: existingTask.seriesId, userId: req.user._id });
      
      const incomingDatesMap = new Map();
      dates.forEach(d => {
        const dateStr = typeof d === 'string' ? d : d?.date;
        const timeStr = typeof d === 'object' ? (d.time || '') : '';
        if (dateStr && !incomingDatesMap.has(dateStr)) {
          incomingDatesMap.set(dateStr, timeStr);
        }
      });
      
      const toDelete = existingSeries.filter(t => !incomingDatesMap.has(t.date));
      const toUpdate = existingSeries.filter(t => incomingDatesMap.has(t.date));
      const existingDateStrings = new Set(existingSeries.map(t => t.date));
      
      const toCreate = Array.from(incomingDatesMap.entries())
        .filter(([dateStr]) => !existingDateStrings.has(dateStr))
        .map(([dateStr, timeStr]) => ({
          title: title || existingTask.title,
          description: description !== undefined ? description : existingTask.description,
          category: category || existingTask.category,
          priority: priority || existingTask.priority,
          tags: tags !== undefined ? tags : existingTask.tags,
          date: dateStr,
          time: timeStr,
          seriesId: existingTask.seriesId,
          userId: req.user._id,
          status: 'non_completed'
        }));
        
      if (toDelete.length > 0) {
        await Task.deleteMany({ _id: { $in: toDelete.map(t => t._id) } });
      }
      
      if (toUpdate.length > 0) {
        for (const t of toUpdate) {
          if (title) t.title = title;
          if (description !== undefined) t.description = description;
          if (category) t.category = category;
          if (priority) t.priority = priority;
          if (tags !== undefined) t.tags = tags;
          t.time = incomingDatesMap.get(t.date);
          await t.save();
        }
      }
      
      if (toCreate.length > 0) {
        await Task.insertMany(toCreate);
      }
    } else {
      if (title) existingTask.title = title;
      if (description !== undefined) existingTask.description = description;
      if (category) existingTask.category = category;
      if (priority) existingTask.priority = priority;
      if (tags !== undefined) existingTask.tags = tags;
      if (req.body.dueDate || req.body.date) existingTask.date = req.body.dueDate || req.body.date;
      if (req.body.dueTime !== undefined || req.body.time !== undefined) existingTask.time = req.body.dueTime || req.body.time || '';
      await existingTask.save();
    }

    await logActivity({ userId: req.user._id, action: 'TASK_UPDATED', description: `Updated task: ${existingTask.title}`, taskId: existingTask._id, req });
    return successResponse(res, { message: 'Task updated successfully', data: existingTask });
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

// DELETE /api/tasks/series/:seriesId
const deleteSeries = async (req, res, next) => {
  try {
    const result = await Task.deleteMany({ seriesId: req.params.seriesId, userId: req.user._id });
    await logActivity({ userId: req.user._id, action: 'TASK_DELETED', description: `Deleted task series`, req });
    return successResponse(res, { message: `${result.deletedCount} tasks deleted` });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/complete
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    const todayStr = getTodayString();

    if (task.date > todayStr) {
      return errorResponse(res, { message: 'Cannot complete a task scheduled for a future date', statusCode: 400 });
    }

    task.status = 'completed';
    task.completedAt = new Date();
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
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return errorResponse(res, { message: 'Task not found', statusCode: 404 });

    const todayStr = getTodayString();

    if (task.date > todayStr) {
      return errorResponse(res, { message: 'Cannot modify a task scheduled for a future date', statusCode: 400 });
    }

    task.status = 'non_completed';
    task.completedAt = null;
    await task.save();
    
    return successResponse(res, { message: 'Task marked as non_completed', data: task });
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

    const todayStr = getTodayString();
    
    // Only allow completing non-future tasks
    const result = await Task.updateMany(
      { _id: { $in: ids }, userId: req.user._id, date: { $lte: todayStr } },
      { status: 'completed', completedAt: new Date() }
    );
    await logActivity({ userId: req.user._id, action: 'BULK_COMPLETE', description: `Bulk completed ${result.modifiedCount} tasks`, req });
    return successResponse(res, { message: `${result.modifiedCount} tasks completed` });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getTasks, getTask, getSeries, createTask, updateTask, deleteTask, deleteSeries,
  completeTask, pendingTask, archiveTask, bulkDeleteTasks, bulkCompleteTasks 
};

