const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { successResponse } = require('../utils/apiResponse');

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Last month for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalTasks,
      pendingTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      upcomingTasks,
      lastMonthTotal,
      lastMonthCompleted,
      recentActivity,
      monthlyProgress,
    ] = await Promise.all([
      Task.countDocuments({ userId, isArchived: false }),
      Task.countDocuments({ userId, status: 'pending', isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', isArchived: false }),
      Task.countDocuments({ userId, status: 'overdue', isArchived: false }),
      Task.find({ userId, dueDate: { $gte: todayStart, $lt: todayEnd }, isArchived: false })
        .sort({ dueDate: 1 })
        .limit(20)
        .lean(),
      Task.find({
        userId,
        dueDate: { $gte: todayEnd },
        status: 'pending',
        isArchived: false,
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),
      Task.countDocuments({ userId, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      Task.countDocuments({ userId, status: 'completed', completedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Task.aggregate([
        { $match: { userId, dueDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: { $dayOfMonth: '$dueDate' }, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
        { $sort: { '_id': 1 } },
      ]),
    ]);

    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const lastMonthProductivity = lastMonthTotal > 0 ? Math.round((lastMonthCompleted / lastMonthTotal) * 100) : 0;

    return successResponse(res, {
      data: {
        stats: {
          totalTasks,
          pendingTasks,
          completedTasks,
          overdueTasks,
          productivity,
          lastMonthProductivity,
        },
        todayTasks,
        upcomingTasks,
        recentActivity,
        monthlyProgress,
        currentDate: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
