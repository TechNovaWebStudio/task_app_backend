const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { successResponse } = require('../utils/apiResponse');

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    
    const todayStr = formatDate(now);
    
    const monthStartStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEndStr = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const lastMonthStartStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEndStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));

    const [
      totalTasks,
      pendingTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      todayCompletedCount,
      todayNonCompletedCount,
      upcomingTasks,
      lastMonthTotal,
      lastMonthCompleted,
      recentActivity,
      monthlyProgress,
    ] = await Promise.all([
      Task.countDocuments({ userId, isArchived: false }),
      Task.countDocuments({ userId, status: 'non_completed', isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', isArchived: false }),
      Task.countDocuments({ userId, status: 'non_completed', date: { $lt: todayStr }, isArchived: false }),
      Task.find({ userId, date: todayStr, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Task.countDocuments({ userId, date: todayStr, status: 'completed', isArchived: false }),
      Task.countDocuments({ userId, date: todayStr, status: 'non_completed', isArchived: false }),
      Task.find({
        userId,
        date: { $gt: todayStr },
        status: 'non_completed',
        isArchived: false,
      })
        .sort({ date: 1, createdAt: -1 })
        .limit(10)
        .lean(),
      Task.countDocuments({ userId, date: { $gte: lastMonthStartStr, $lte: lastMonthEndStr }, isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', date: { $gte: lastMonthStartStr, $lte: lastMonthEndStr }, isArchived: false }),
      ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Task.aggregate([
        { $match: { userId, date: { $gte: monthStartStr, $lte: monthEndStr }, isArchived: false } },
        { $group: { _id: '$date', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
        { $sort: { '_id': 1 } },
      ]),
    ]);

    const formattedMonthlyProgress = monthlyProgress.map(mp => {
      const day = parseInt(mp._id.split('-')[2], 10);
      return { _id: day, date: mp._id, total: mp.total, completed: mp.completed };
    });

    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const lastMonthProductivity = lastMonthTotal > 0 ? Math.round((lastMonthCompleted / lastMonthTotal) * 100) : 0;
    
    const todayTotal = todayTasks.length;
    const todayCompleted = todayCompletedCount;
    const todayNonCompleted = todayNonCompletedCount;
    const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    return successResponse(res, {
      data: {
        stats: {
          totalTasks,
          pendingTasks,
          completedTasks,
          overdueTasks,
          productivity,
          lastMonthProductivity,
          todayTotal,
          todayCompleted,
          todayNonCompleted,
          todayCompletionRate,
        },
        todayTasks,
        upcomingTasks,
        recentActivity,
        monthlyProgress: formattedMonthlyProgress,
        currentDate: now.toISOString(),
        todayStr
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };

