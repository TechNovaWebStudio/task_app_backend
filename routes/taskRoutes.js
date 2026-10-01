const express = require('express');
const router = express.Router();
const {
  getTasks, getTask, getSeries, createTask, updateTask, deleteTask, deleteSeries,
  completeTask, pendingTask, archiveTask, bulkDeleteTasks, bulkCompleteTasks,
  reorderTasks,
} = require('../controllers/taskController');
const { createTaskValidator, updateTaskValidator } = require('../validators/taskValidator');
const { validate } = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTasks);
router.post('/', createTaskValidator, validate, createTask);
router.post('/bulk-delete', bulkDeleteTasks);
router.post('/bulk-complete', bulkCompleteTasks);
router.patch('/reorder', reorderTasks);
router.get('/series/:seriesId', getSeries);
router.delete('/series/:seriesId', deleteSeries);
router.get('/:id', getTask);
router.put('/:id', updateTaskValidator, validate, updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/pending', pendingTask);
router.patch('/:id/archive', archiveTask);

module.exports = router;
