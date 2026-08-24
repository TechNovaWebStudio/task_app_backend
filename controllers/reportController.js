const Task = require('../models/Task');
const { successResponse } = require('../utils/apiResponse');

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
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
      endStr = formatDate(now); // to current day
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
      // Usually you want current month up to now or end of month, let's just do end of month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endStr = formatDate(endOfMonth);
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = formatDate(startOfLastMonth);
      endStr = formatDate(endOfLastMonth);
    } else if (period === 'all_time') {
      startStr = '1970-01-01';
      endStr = '2100-01-01';
    } else {
      // Default fallback
      startStr = formatDate(now);
      endStr = formatDate(now);
    }

    // Aggregation pipeline to get day-by-day stats based on dates array
    const pipeline = [
      { $match: { userId } },
      { $unwind: '$dates' },
      { $match: { 'dates.date': { $gte: startStr, $lte: endStr } } },
      {
        $group: {
          _id: '$dates.date',
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$dates.completed', true] }, 1, 0] } },
          nonCompletedTasks: { $sum: { $cond: [{ $eq: ['$dates.completed', false] }, 1, 0] } },
        }
      },
      { $sort: { _id: -1 } } // newest date first
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
        date: day._id,
        totalTasks: day.totalTasks,
        completedTasks: day.completedTasks,
        nonCompletedTasks: day.nonCompletedTasks,
        completionPercentage
      };
    });

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Fetch tasks that fall into this date range
    const taskDetails = await Task.find({
      userId,
      'dates.date': { $gte: startStr, $lte: endStr }
    }).sort({ createdAt: -1 }).lean();

    return successResponse(res, {
      data: {
        totalTasks,
        completedTasks,
        nonCompletedTasks,
        completionPercentage,
        dailyReports,
        taskDetails,
        period: { start: startStr, end: endStr }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReports };
