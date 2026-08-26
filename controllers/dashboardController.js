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
    
    // Week calculation (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    // Month calculation
    const monthStartStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEndStr = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const lastMonthStartStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEndStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));

    // Year calculation
    const yearStartStr = `${now.getFullYear()}-01-01`;
    const yearEndStr = `${now.getFullYear()}-12-31`;

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
      weekTasksTotal,
      weekTasksCompleted,
      monthTasksTotal,
      monthTasksCompleted,
      yearTasksTotal,
      yearTasksCompleted,
      categoryStatsRaw,
    ] = await Promise.all([
      Task.countDocuments({ userId, isArchived: false }),
      Task.countDocuments({ userId, status: 'non_completed', isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', isArchived: false }),
      Task.countDocuments({ userId, status: 'non_completed', date: { $lt: todayStr }, isArchived: false }),
      Task.find({ userId, date: todayStr, isArchived: false })
        .sort({ createdAt: 1 })
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
        .sort({ date: 1, createdAt: 1 })
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
      // Weekly stats
      Task.countDocuments({ userId, date: { $gte: weekStartStr, $lte: weekEndStr }, isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', date: { $gte: weekStartStr, $lte: weekEndStr }, isArchived: false }),
      // Monthly stats
      Task.countDocuments({ userId, date: { $gte: monthStartStr, $lte: monthEndStr }, isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', date: { $gte: monthStartStr, $lte: monthEndStr }, isArchived: false }),
      // Yearly stats
      Task.countDocuments({ userId, date: { $gte: yearStartStr, $lte: yearEndStr }, isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', date: { $gte: yearStartStr, $lte: yearEndStr }, isArchived: false }),
      // Category stats
      Task.aggregate([
        { $match: { userId, isArchived: false } },
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            nonCompleted: { $sum: { $cond: [{ $eq: ['$status', 'non_completed'] }, 1, 0] } }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    const formattedMonthlyProgress = monthlyProgress.map(mp => {
      const day = parseInt(mp._id.split('-')[2], 10);
      return { _id: day, date: mp._id, total: mp.total, completed: mp.completed };
    });

    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const lastMonthProductivity = lastMonthTotal > 0 ? Math.round((lastMonthCompleted / lastMonthTotal) * 100) : 0;
    
    const todayTotal = todayCompletedCount + todayNonCompletedCount;
    const todayCompleted = todayCompletedCount;
    const todayNonCompleted = todayNonCompletedCount;
    const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    const weeklyStats = {
      total: weekTasksTotal,
      completed: weekTasksCompleted,
      nonCompleted: Math.max(0, weekTasksTotal - weekTasksCompleted),
      completionRate: weekTasksTotal > 0 ? Math.round((weekTasksCompleted / weekTasksTotal) * 100) : 0
    };

    const monthlyStats = {
      total: monthTasksTotal,
      completed: monthTasksCompleted,
      nonCompleted: Math.max(0, monthTasksTotal - monthTasksCompleted),
      completionRate: monthTasksTotal > 0 ? Math.round((monthTasksCompleted / monthTasksTotal) * 100) : 0
    };

    const yearlyStats = {
      total: yearTasksTotal,
      completed: yearTasksCompleted,
      nonCompleted: Math.max(0, yearTasksTotal - yearTasksCompleted),
      completionRate: yearTasksTotal > 0 ? Math.round((yearTasksCompleted / yearTasksTotal) * 100) : 0
    };

    const categoryStats = categoryStatsRaw.map(c => ({
      category: c._id || 'Uncategorized',
      total: c.total,
      completed: c.completed,
      nonCompleted: c.nonCompleted,
      completionRate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0
    }));

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
        weeklyStats,
        monthlyStats,
        yearlyStats,
        categoryStats,
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
