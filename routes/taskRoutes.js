import express from 'express';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getUsers,
  getCompanies
} from '../controllers/taskController.js';

const router = express.Router();

// Task endpoints
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Additional endpoints for dropdown data
router.get('/dropdown/users', getUsers);
router.get('/dropdown/companies', getCompanies);

export default router;