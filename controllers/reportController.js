const Task = require('../models/Task');
const { successResponse } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');

// GET /api/reports
const getReports = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = 'monthly', startDate, endDate, page, limit } = req.query;
    const { skip } = getPagination(req.query);
    const lim = Math.min(100, parseInt(limit, 10) || 10);

    let start, end;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
    } else {
      // monthly (default)
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const dateFilter = { userId, createdAt: { $gte: start, $lte: end } };

    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      categoryBreakdown,
      priorityBreakdown,
      dailyTrend,
      taskDetails,
      totalForPagination,
    ] = await Promise.all([
      Task.countDocuments(dateFilter),
      Task.countDocuments({ ...dateFilter, status: 'completed' }),
      Task.countDocuments({ ...dateFilter, status: 'pending' }),
      Task.countDocuments({ ...dateFilter, status: 'overdue' }),
      Task.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
      Task.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$priority', total: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Task.find(dateFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Task.countDocuments(dateFilter),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Avg completion time in minutes
    const completedWithTime = await Task.find({
      ...dateFilter,
      status: 'completed',
      completedAt: { $exists: true },
    }).select('createdAt completedAt').lean();

    let avgCompletionTime = 0;
    if (completedWithTime.length > 0) {
      const totalMinutes = completedWithTime.reduce((sum, t) => {
        const diff = (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60);
        return sum + diff;
      }, 0);
      avgCompletionTime = Math.round(totalMinutes / completedWithTime.length);
    }

    return successResponse(res, {
      data: {
        stats: { totalTasks, completedTasks, pendingTasks, overdueTasks, completionRate, avgCompletionTime },
        categoryBreakdown,
        priorityBreakdown,
        dailyTrend,
        taskDetails,
        period: { start, end },
      },
      meta: buildMeta(totalForPagination, parseInt(page, 10) || 1, lim),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReports };
