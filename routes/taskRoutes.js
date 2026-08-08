const express = require('express');
const router = express.Router();
const {
  getTasks, getTask, createTask, updateTask, deleteTask,
  completeTask, pendingTask, archiveTask, bulkDeleteTasks, bulkCompleteTasks,
} = require('../controllers/taskController');
const { createTaskValidator, updateTaskValidator } = require('../validators/taskValidator');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTasks);
router.post('/', createTaskValidator, validate, createTask);
router.post('/bulk-delete', bulkDeleteTasks);
router.post('/bulk-complete', bulkCompleteTasks);
router.get('/:id', getTask);
router.put('/:id', updateTaskValidator, validate, updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/pending', pendingTask);
router.patch('/:id/archive', archiveTask);

module.exports = router;
