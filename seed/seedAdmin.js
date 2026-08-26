/**
 * Seed Script — creates admin, categories, and 30 days of tasks
 * Run: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const Task = require('../models/Task');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todo_app';

const defaultCategories = [
  { name: 'Study', color: '#3B82F6', icon: 'book', isDefault: true },
  { name: 'Work', color: '#7C3AED', icon: 'briefcase', isDefault: true },
  { name: 'Health', color: '#10B981', icon: 'heart', isDefault: true },
  { name: 'Fitness', color: '#F97316', icon: 'activity', isDefault: true },
  { name: 'Personal', color: '#EC4899', icon: 'user', isDefault: true },
  { name: 'Habits', color: '#8B5CF6', icon: 'check-square', isDefault: true },
  { name: 'Shopping', color: '#F59E0B', icon: 'shopping-cart', isDefault: true },
  { name: 'Finance', color: '#6366F1', icon: 'dollar-sign', isDefault: true },
  { name: 'Family', color: '#EF4444', icon: 'heart-handshake', isDefault: true },
  { name: 'Other', color: '#6B7280', icon: 'more-horizontal', isDefault: true },
];

const monthlyTaskData = [
  // Day 1
  [
    { title: 'Morning Exercise', description: 'Start the day with 30 minutes cardio', category: 'Fitness', priority: 'high', status: 'completed', dueTime: '06:00 AM', estimatedDuration: 30 },
    { title: 'Project Planning Session', description: 'Plan Q1 project milestones and deliverables', category: 'Work', priority: 'high', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 90 },
    { title: 'Read Documentation', description: 'Review Next.js and React documentation', category: 'Study', priority: 'medium', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 60 },
  ],
  // Day 2
  [
    { title: 'Team Standup Meeting', description: 'Daily team sync and progress updates', category: 'Meeting', priority: 'high', status: 'completed', dueTime: '09:30 AM', estimatedDuration: 30 },
    { title: 'UI Design Review', description: 'Review and give feedback on dashboard designs', category: 'Work', priority: 'high', status: 'completed', dueTime: '11:00 AM', estimatedDuration: 120 },
    { title: 'Grocery Shopping', description: 'Buy weekly groceries and household items', category: 'Shopping', priority: 'medium', status: 'completed', dueTime: '06:00 PM', estimatedDuration: 60 },
  ],
  // Day 3
  [
    { title: 'JavaScript Practice', description: 'Complete 5 algorithm challenges on LeetCode', category: 'Study', priority: 'medium', status: 'completed', dueTime: '08:00 AM', estimatedDuration: 90 },
    { title: 'Client Call — Project Update', description: 'Present project progress to the client', category: 'Meeting', priority: 'high', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Banking Tasks', description: 'Transfer funds and review monthly statement', category: 'Finance', priority: 'medium', status: 'completed', dueTime: '04:30 PM', estimatedDuration: 30 },
  ],
  // Day 4
  [
    { title: 'Doctor Appointment', description: 'Annual health checkup with general physician', category: 'Health', priority: 'high', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 90 },
    { title: 'Code Review', description: 'Review pull requests from team members', category: 'Work', priority: 'medium', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Home Cleaning', description: 'Deep clean the living room and kitchen', category: 'Home', priority: 'low', status: 'completed', dueTime: '05:00 PM', estimatedDuration: 120 },
  ],
  // Day 5
  [
    { title: 'Sprint Planning', description: 'Plan tasks for the upcoming 2-week sprint', category: 'Work', priority: 'high', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 120 },
    { title: 'Gym Workout', description: 'Strength training — chest and triceps', category: 'Fitness', priority: 'medium', status: 'completed', dueTime: '06:00 PM', estimatedDuration: 75 },
    { title: 'Monthly Budget Review', description: 'Review spending and update budget spreadsheet', category: 'Finance', priority: 'medium', status: 'completed', dueTime: '08:00 PM', estimatedDuration: 45 },
  ],
  // Day 6
  [
    { title: 'Weekend Trip Planning', description: 'Research and book weekend getaway', category: 'Travel', priority: 'low', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 60 },
    { title: 'Read React Best Practices', description: 'Study advanced React patterns and performance', category: 'Study', priority: 'medium', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 90 },
    { title: 'Meal Prep', description: 'Prepare healthy meals for the week', category: 'Health', priority: 'medium', status: 'completed', dueTime: '05:00 PM', estimatedDuration: 120 },
  ],
  // Day 7
  [
    { title: 'Family Dinner', description: 'Sunday family dinner and catch-up', category: 'Personal', priority: 'high', status: 'completed', dueTime: '07:00 PM', estimatedDuration: 120 },
    { title: 'Weekly Review', description: 'Review goals and prepare for the next week', category: 'Personal', priority: 'medium', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 45 },
    { title: 'Online Course Module', description: 'Complete Module 4 of the Node.js course', category: 'Study', priority: 'medium', status: 'completed', dueTime: '03:00 PM', estimatedDuration: 90 },
  ],
  // Day 8
  [
    { title: 'API Development', description: 'Build REST API for the user authentication module', category: 'Work', priority: 'high', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 180 },
    { title: 'Team Retrospective', description: 'Sprint retrospective meeting with the team', category: 'Meeting', priority: 'high', status: 'completed', dueTime: '03:00 PM', estimatedDuration: 60 },
    { title: 'Evening Run', description: '5km evening run in the park', category: 'Fitness', priority: 'low', status: 'completed', dueTime: '06:30 PM', estimatedDuration: 45 },
  ],
  // Day 9
  [
    { title: 'Database Optimization', description: 'Add indexes and optimize slow queries', category: 'Work', priority: 'high', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 120 },
    { title: 'Dentist Appointment', description: 'Routine dental checkup and cleaning', category: 'Health', priority: 'high', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Buy Electronics', description: 'Purchase keyboard and mouse for home office', category: 'Shopping', priority: 'low', status: 'completed', dueTime: '05:00 PM', estimatedDuration: 60 },
  ],
  // Day 10
  [
    { title: 'Write Technical Documentation', description: 'Document the new API endpoints and schemas', category: 'Work', priority: 'medium', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 120 },
    { title: 'Yoga Session', description: 'Morning yoga for flexibility and mental clarity', category: 'Fitness', priority: 'low', status: 'completed', dueTime: '07:00 AM', estimatedDuration: 45 },
    { title: 'Investment Review', description: 'Review stock portfolio and rebalance if needed', category: 'Finance', priority: 'medium', status: 'completed', dueTime: '04:00 PM', estimatedDuration: 60 },
  ],
  // Day 11
  [
    { title: 'Frontend Bug Fixes', description: 'Fix reported UI bugs in the dashboard', category: 'Work', priority: 'high', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 150 },
    { title: 'Product Roadmap Meeting', description: 'Discuss Q2 product roadmap with stakeholders', category: 'Meeting', priority: 'high', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 90 },
    { title: 'Daily Journal', description: 'Write journal entry for self-reflection', category: 'Personal', priority: 'low', status: 'completed', dueTime: '09:00 PM', estimatedDuration: 20 },
  ],
  // Day 12
  [
    { title: 'Marketing Campaign Review', description: 'Analyze digital marketing performance', category: 'Work', priority: 'medium', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 90 },
    { title: 'Pay Utility Bills', description: 'Pay electricity, internet, and water bills', category: 'Finance', priority: 'high', status: 'completed', dueTime: '12:00 PM', estimatedDuration: 20 },
    { title: 'Bike Ride', description: '15km cycling through the city', category: 'Fitness', priority: 'low', status: 'completed', dueTime: '05:00 PM', estimatedDuration: 60 },
  ],
  // Day 13
  [
    { title: 'Study Machine Learning', description: 'Complete Chapter 5 of ML fundamentals book', category: 'Study', priority: 'medium', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 120 },
    { title: 'House Maintenance', description: 'Fix leaking faucet and replace light bulbs', category: 'Home', priority: 'medium', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 90 },
    { title: 'Movie Night', description: 'Watch a movie with family', category: 'Personal', priority: 'low', status: 'completed', dueTime: '08:00 PM', estimatedDuration: 120 },
  ],
  // Day 14
  [
    { title: 'Travel Booking', description: 'Book flights and hotel for summer vacation', category: 'Travel', priority: 'high', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 60 },
    { title: 'Weekly Grocery Run', description: 'Shop for fresh produce and essentials', category: 'Shopping', priority: 'medium', status: 'completed', dueTime: '04:00 PM', estimatedDuration: 60 },
    { title: 'Read Fiction Book', description: 'Continue reading "Atomic Habits"', category: 'Personal', priority: 'low', status: 'completed', dueTime: '09:00 PM', estimatedDuration: 45 },
  ],
  // Day 15
  [
    { title: 'Code Refactoring', description: 'Refactor task service for better maintainability', category: 'Work', priority: 'medium', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 120 },
    { title: 'Performance Review Meeting', description: 'Mid-year performance review with manager', category: 'Meeting', priority: 'high', status: 'completed', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Meditation Practice', description: '20-minute guided meditation session', category: 'Health', priority: 'low', status: 'completed', dueTime: '07:00 AM', estimatedDuration: 20 },
  ],
  // Day 16
  [
    { title: 'Unit Testing', description: 'Write unit tests for authentication module', category: 'Work', priority: 'high', status: 'completed', dueTime: '09:00 AM', estimatedDuration: 150 },
    { title: 'Language Learning', description: 'Spanish lesson on Duolingo — 30 minutes', category: 'Study', priority: 'low', status: 'completed', dueTime: '07:00 PM', estimatedDuration: 30 },
    { title: 'Home Decor Shopping', description: 'Buy new curtains and cushions for living room', category: 'Shopping', priority: 'low', status: 'pending', dueTime: '04:00 PM', estimatedDuration: 90 },
  ],
  // Day 17
  [
    { title: 'Client Presentation', description: 'Present the completed features to the client', category: 'Work', priority: 'high', status: 'completed', dueTime: '10:00 AM', estimatedDuration: 90 },
    { title: 'Swimming', description: 'Morning swim — 30 laps', category: 'Fitness', priority: 'medium', status: 'completed', dueTime: '07:00 AM', estimatedDuration: 60 },
    { title: 'Call Parents', description: 'Weekly check-in call with family', category: 'Personal', priority: 'high', status: 'completed', dueTime: '08:00 PM', estimatedDuration: 30 },
  ],
  // Day 18
  [
    { title: 'Security Audit', description: 'Review application for security vulnerabilities', category: 'Work', priority: 'high', status: 'pending', dueTime: '09:00 AM', estimatedDuration: 180 },
    { title: 'Pharmacy Run', description: 'Pick up prescribed medications', category: 'Health', priority: 'high', status: 'pending', dueTime: '01:00 PM', estimatedDuration: 30 },
    { title: 'Online Shopping', description: 'Order birthday gifts for friends', category: 'Shopping', priority: 'low', status: 'pending', dueTime: '07:00 PM', estimatedDuration: 30 },
  ],
  // Day 19
  [
    { title: 'Deployment to Staging', description: 'Deploy latest build to staging environment', category: 'Work', priority: 'high', status: 'pending', dueTime: '10:00 AM', estimatedDuration: 60 },
    { title: 'Financial Planning', description: 'Review retirement savings and insurance', category: 'Finance', priority: 'medium', status: 'pending', dueTime: '03:00 PM', estimatedDuration: 60 },
    { title: 'Garden Maintenance', description: 'Water plants and trim the garden', category: 'Home', priority: 'low', status: 'pending', dueTime: '06:00 PM', estimatedDuration: 45 },
  ],
  // Day 20
  [
    { title: 'User Acceptance Testing', description: 'Coordinate UAT with the QA team', category: 'Work', priority: 'high', status: 'pending', dueTime: '09:00 AM', estimatedDuration: 240 },
    { title: 'Meal Planning', description: 'Plan healthy meal menu for next week', category: 'Health', priority: 'medium', status: 'pending', dueTime: '05:00 PM', estimatedDuration: 45 },
    { title: 'Reading Time', description: 'Read 30 pages of current book', category: 'Personal', priority: 'low', status: 'pending', dueTime: '09:00 PM', estimatedDuration: 45 },
  ],
  // Day 21
  [
    { title: 'Architecture Discussion', description: 'Team discussion on microservices migration', category: 'Meeting', priority: 'high', status: 'pending', dueTime: '10:00 AM', estimatedDuration: 90 },
    { title: 'Hiking Trip', description: 'Day hike at the nature reserve', category: 'Fitness', priority: 'medium', status: 'pending', dueTime: '08:00 AM', estimatedDuration: 240 },
    { title: 'Tax Preparation', description: 'Gather documents for annual tax filing', category: 'Finance', priority: 'high', status: 'pending', dueTime: '03:00 PM', estimatedDuration: 120 },
  ],
  // Day 22
  [
    { title: 'Product Launch Prep', description: 'Final checks before product launch', category: 'Work', priority: 'high', status: 'pending', dueTime: '09:00 AM', estimatedDuration: 180 },
    { title: 'Wardrobe Organization', description: 'Sort and organize seasonal clothing', category: 'Home', priority: 'low', status: 'pending', dueTime: '04:00 PM', estimatedDuration: 90 },
    { title: 'Podcast Recording', description: 'Record episode on productivity techniques', category: 'Personal', priority: 'medium', status: 'pending', dueTime: '07:00 PM', estimatedDuration: 60 },
  ],
  // Day 23
  [
    { title: 'UI/UX Design Review', description: 'Review the new dashboard design', category: 'Work', priority: 'high', status: 'in-progress', dueTime: '10:00 AM', estimatedDuration: 120 },
    { title: 'Team Meeting', description: 'Weekly team sync up meeting', category: 'Meeting', priority: 'medium', status: 'pending', dueTime: '11:30 AM', estimatedDuration: 45 },
    { title: 'Fix Calendar Bug', description: 'Resolve the date selection issue', category: 'Work', priority: 'high', status: 'pending', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Buy Groceries', description: 'Purchase daily essential items', category: 'Shopping', priority: 'low', status: 'pending', dueTime: '05:00 PM', estimatedDuration: 45 },
    { title: 'Read React Docs', description: 'Learn about useContext hook', category: 'Study', priority: 'medium', status: 'pending', dueTime: '07:00 PM', estimatedDuration: 60 },
    { title: 'Workout', description: 'Evening fitness training', category: 'Health', priority: 'low', status: 'completed', dueTime: '07:30 PM', estimatedDuration: 60 },
  ],
  // Day 24
  [
    { title: 'Performance Optimization', description: 'Optimize frontend bundle size and loading speed', category: 'Work', priority: 'medium', status: 'pending', dueTime: '09:00 AM', estimatedDuration: 150 },
    { title: 'Grocery Shopping', description: 'Weekly grocery run at the supermarket', category: 'Shopping', priority: 'medium', status: 'pending', dueTime: '05:00 PM', estimatedDuration: 60 },
    { title: 'Cooking New Recipe', description: 'Try a new healthy pasta recipe for dinner', category: 'Health', priority: 'low', status: 'pending', dueTime: '07:00 PM', estimatedDuration: 60 },
  ],
  // Day 25
  [
    { title: 'Investor Report', description: 'Prepare monthly investor performance report', category: 'Finance', priority: 'high', status: 'overdue', dueTime: '09:00 AM', estimatedDuration: 120 },
    { title: 'Team Training', description: 'Conduct training session on new tools', category: 'Meeting', priority: 'medium', status: 'pending', dueTime: '02:00 PM', estimatedDuration: 90 },
    { title: 'Pilates Class', description: 'Weekly pilates class at the studio', category: 'Fitness', priority: 'low', status: 'pending', dueTime: '06:00 PM', estimatedDuration: 60 },
  ],
  // Day 26
  [
    { title: 'Feature Development', description: 'Implement calendar view for task management', category: 'Work', priority: 'high', status: 'overdue', dueTime: '09:00 AM', estimatedDuration: 240 },
    { title: 'Book Doctor Appointment', description: 'Schedule physiotherapy session', category: 'Health', priority: 'medium', status: 'pending', dueTime: '12:00 PM', estimatedDuration: 15 },
    { title: 'Home Office Setup', description: 'Organize and upgrade the home workspace', category: 'Home', priority: 'low', status: 'pending', dueTime: '04:00 PM', estimatedDuration: 90 },
  ],
  // Day 27
  [
    { title: 'Cross-browser Testing', description: 'Test application on Safari, Firefox, and Chrome', category: 'Work', priority: 'high', status: 'pending', dueTime: '10:00 AM', estimatedDuration: 120 },
    { title: 'Study TypeScript', description: 'Complete TypeScript beginner tutorial series', category: 'Study', priority: 'medium', status: 'pending', dueTime: '02:00 PM', estimatedDuration: 90 },
    { title: 'Dinner with Friends', description: 'Catch up dinner with college friends', category: 'Personal', priority: 'medium', status: 'pending', dueTime: '07:30 PM', estimatedDuration: 120 },
  ],
  // Day 28
  [
    { title: 'Release Preparation', description: 'Prepare release notes and version changelog', category: 'Work', priority: 'high', status: 'pending', dueTime: '09:00 AM', estimatedDuration: 60 },
    { title: 'Morning Run', description: '8km outdoor run in the neighborhood', category: 'Fitness', priority: 'medium', status: 'pending', dueTime: '06:30 AM', estimatedDuration: 55 },
    { title: 'Photo Organizing', description: 'Sort and organize digital photo library', category: 'Personal', priority: 'low', status: 'pending', dueTime: '05:00 PM', estimatedDuration: 60 },
  ],
  // Day 29
  [
    { title: 'Sprint Demo', description: 'Demo completed sprint features to the team', category: 'Work', priority: 'high', status: 'pending', dueTime: '10:00 AM', estimatedDuration: 90 },
    { title: 'Volunteer Work', description: 'Help at local community garden project', category: 'Personal', priority: 'medium', status: 'pending', dueTime: '02:00 PM', estimatedDuration: 180 },
    { title: 'Monthly Finance Summary', description: 'Compile and review monthly financial data', category: 'Finance', priority: 'medium', status: 'pending', dueTime: '08:00 PM', estimatedDuration: 45 },
  ],
  // Day 30
  [
    { title: 'Project Completion Review', description: 'Final review of all project deliverables', category: 'Work', priority: 'high', status: 'pending', dueTime: '10:00 AM', estimatedDuration: 120 },
    { title: 'Monthly Goals Review', description: 'Review monthly goals and set new targets', category: 'Personal', priority: 'high', status: 'pending', dueTime: '02:00 PM', estimatedDuration: 60 },
    { title: 'Relax and Recharge', description: 'End of month relaxation — spa or nature walk', category: 'Health', priority: 'low', status: 'pending', dueTime: '05:00 PM', estimatedDuration: 120 },
  ],
];

const seed = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Upsert admin
    let admin = await Admin.findOne({ email: 'admin@todoapp.com' });
    if (!admin) {
      admin = await Admin.create({
        name: 'John Doe',
        email: 'admin@todoapp.com',
        password: 'Admin@123456',
        role: 'admin',
      });
      console.log('✅ Admin created — email: admin@todoapp.com | password: Admin@123456');
    } else {
      console.log('ℹ️  Admin already exists — skipping');
    }

    // Upsert settings
    await Settings.findOneAndUpdate({ userId: admin._id }, { userId: admin._id }, { upsert: true });

    // Upsert categories
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
    }
    console.log(`✅ ${defaultCategories.length} categories seeded`);

    // Seed tasks
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let taskCount = 0;
    for (let day = 0; day < monthlyTaskData.length; day++) {
      const dayTasks = monthlyTaskData[day];
      const date = new Date(year, month, day + 1);

      for (const taskTemplate of dayTasks) {
        const exists = await Task.findOne({ title: taskTemplate.title, userId: admin._id, dueDate: { $gte: new Date(year, month, day + 1), $lt: new Date(year, month, day + 2) } });
        if (!exists) {
          const completedAt = taskTemplate.status === 'completed' ? new Date(date.getTime() + 2 * 60 * 60 * 1000) : null;
          await Task.create({
            ...taskTemplate,
            userId: admin._id,
            dueDate: date,
            completedAt,
          });
          taskCount++;
        }
      }
    }
    console.log(`✅ ${taskCount} tasks seeded for ${month + 1}/${year}`);

    // Seed sample activity logs
    const logCount = await ActivityLog.countDocuments({ userId: admin._id });
    if (logCount === 0) {
      await ActivityLog.insertMany([
        { userId: admin._id, action: 'LOGIN', description: 'Admin admin@todoapp.com logged in', createdAt: new Date(Date.now() - 3600000) },
        { userId: admin._id, action: 'TASK_CREATED', description: 'Created task: Morning Exercise', createdAt: new Date(Date.now() - 7200000) },
        { userId: admin._id, action: 'TASK_COMPLETED', description: 'Completed task: Morning Exercise', createdAt: new Date(Date.now() - 3000000) },
      ]);
      console.log('✅ Sample activity logs created');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('📧 Admin Email: admin@todoapp.com');
    console.log('🔑 Admin Password: Admin@123456');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
