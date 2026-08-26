const Task = require('../models/Task');
const { successResponse } = require('../utils/apiResponse');

// Helper to format date as YYYY-MM-DD in local time
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/reports
const getReports = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = 'today', startDate, endDate } = req.query;

    let startStr, endStr;
    const now = new Date();

    if (period === 'custom' && startDate && endDate) {
      startStr = startDate;
      endStr = endDate;
    } else if (period === 'today') {
      startStr = formatDate(now);
      endStr = formatDate(now);
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startStr = formatDate(yesterday);
      endStr = formatDate(yesterday);
    } else if (period === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(diff);
      startStr = formatDate(startOfWeek);
      endStr = formatDate(now);
    } else if (period === 'last_week') {
      const day = now.getDay();
      const diffToLastWeekStart = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(diffToLastWeekStart);
      const endOfLastWeek = new Date(now);
      endOfLastWeek.setDate(diffToLastWeekStart + 6);
      startStr = formatDate(startOfLastWeek);
      endStr = formatDate(endOfLastWeek);
    } else if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = formatDate(startOfMonth);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endStr = formatDate(endOfMonth);
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = formatDate(startOfLastMonth);
      endStr = formatDate(endOfLastMonth);
    } else if (period === 'this_year' || period === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      startStr = formatDate(startOfYear);
      endStr = formatDate(endOfYear);
    } else if (period === 'all_time') {
      startStr = '1970-01-01';
      endStr = '2100-01-01';
    } else {
      startStr = formatDate(now);
      endStr = formatDate(now);
    }

    const pipeline = [
      { $match: { userId, date: { $gte: startStr, $lte: endStr }, isArchived: false } },
      {
        $group: {
          _id: '$date',
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          nonCompletedTasks: { $sum: { $cond: [{ $eq: ['$status', 'non_completed'] }, 1, 0] } },
        }
      },
      { $sort: { _id: -1 } } 
    ];

    const dailyData = await Task.aggregate(pipeline);

    let totalTasks = 0;
    let completedTasks = 0;
    let nonCompletedTasks = 0;

    const dailyReports = dailyData.map(day => {
      totalTasks += day.totalTasks;
      completedTasks += day.completedTasks;
      nonCompletedTasks += day.nonCompletedTasks;
      
      const completionPercentage = day.totalTasks > 0 ? Math.round((day.completedTasks / day.totalTasks) * 100) : 0;
      
      return {
        date: day._id, // format: YYYY-MM-DD
        totalTasks: day.totalTasks,
        completedTasks: day.completedTasks,
        nonCompletedTasks: day.nonCompletedTasks,
        completionPercentage
      };
    });

    // Monthly breakdown for yearly view
    let monthlyBreakdown = null;
    if (period === 'this_year' || period === 'yearly') {
      const monthlyData = {};
      dailyReports.forEach(r => {
        const monthPrefix = r.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthPrefix]) {
          monthlyData[monthPrefix] = { total: 0, completed: 0, nonCompleted: 0 };
        }
        monthlyData[monthPrefix].total += r.totalTasks;
        monthlyData[monthPrefix].completed += r.completedTasks;
        monthlyData[monthPrefix].nonCompleted += r.nonCompletedTasks;
      });
      monthlyBreakdown = Object.keys(monthlyData).sort().map(m => {
        const md = monthlyData[m];
        return {
          month: m,
          total: md.total,
          completed: md.completed,
          nonCompleted: md.nonCompleted,
          completionPercentage: md.total > 0 ? Math.round((md.completed / md.total) * 100) : 0
        };
      });
    }

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const taskDetails = await Task.find({
      userId,
      date: { $gte: startStr, $lte: endStr },
      isArchived: false
    }).sort({ date: -1, createdAt: -1 }).lean();

    return successResponse(res, {
      data: {
        totalTasks,
        completedTasks,
        nonCompletedTasks,
        completionPercentage,
        dailyReports,
        monthlyBreakdown,
        taskDetails,
        period: { start: startStr, end: endStr, type: period }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReports };

