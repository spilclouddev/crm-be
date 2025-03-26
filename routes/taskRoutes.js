import express from "express";
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getUsers,
  getCompanies,
  getReminders,
  getPendingReminders,
  markReminderAsSent
} from "../controllers/taskController.js";
import { 
  getPendingNotifications, 
  markNotificationProcessed 
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Task routes - authenticate but don't restrict access
router.route("/")
  .get(authMiddleware, getTasks)
  .post(authMiddleware, createTask);

router.route("/:id")
  .get(authMiddleware, getTaskById)
  .put(authMiddleware, updateTask)
  .delete(authMiddleware, deleteTask);

// Dropdown data routes
router.get("/dropdown/users", authMiddleware, getUsers);
router.get("/dropdown/companies", authMiddleware, getCompanies);

// Reminder routes
router.get("/reminders", authMiddleware, getReminders);
router.get("/reminders/pending", authMiddleware, getPendingReminders);
router.put("/reminders/:id/sent", authMiddleware, markReminderAsSent);

// Notification routes - these still filter by current user
router.get("/notifications/pending", authMiddleware, getPendingNotifications);
router.put("/notifications/:reminderId/processed", authMiddleware, markNotificationProcessed);

export default router;