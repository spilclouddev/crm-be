import Task from "../models/Task.js";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import Reminder from "../models/Reminder.js";
import mongoose from "mongoose";

// Placeholder user ID for tasks created without authentication
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

// Get all tasks - show all tasks to everyone
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

// Get tasks assigned to current user
export const getMyTasks = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get the user's name from the DB
    const user = await User.findById(req.user.id).select('name');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find tasks where assignedTo matches the user's name
    const myTasks = await Task.find({ assignedTo: user.name }).sort({ dueDate: 1 });
    
    res.status(200).json(myTasks);
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    res.status(500).json({ error: "Failed to fetch your tasks" });
  }
};

// Helper function to handle reminder creation or updates
const handleReminderForTask = async (task, userId) => {
  // Only proceed if both reminderDate and reminderTime are explicitly provided
  if (task.reminderDate && task.reminderTime) {
    try {
      // Combine date and time into a single date object
      const reminderDateTime = new Date(`${task.reminderDate}T${task.reminderTime}`);
      
      // If the date is invalid, don't proceed
      if (isNaN(reminderDateTime.getTime())) {
        console.error("Invalid reminder date/time format");
        return;
      }
      
      // Fetch assignee's email if available
      let assigneeEmail = "";
      try {
        const user = await User.findOne({ name: task.assignedTo }).select('email');
        if (user) {
          assigneeEmail = user.email;
        }
      } catch (err) {
        console.error("Error fetching assignee email:", err);
      }
      
      // Check if a reminder already exists for this task
      const existingReminder = await Reminder.findOne({ taskId: task._id });
      
      if (existingReminder) {
        // Update existing reminder
        existingReminder.taskName = task.title;
        existingReminder.description = task.description || "";
        existingReminder.assigneeName = task.assignedTo;
        existingReminder.assigneeEmail = assigneeEmail;
        existingReminder.dueDate = new Date(task.dueDate);
        existingReminder.reminderDate = new Date(task.reminderDate);
        existingReminder.reminderTime = task.reminderTime;
        existingReminder.reminderDateTime = reminderDateTime;
        
        // If the reminder was already sent and we're updating it to a future time,
        // we need to reset its status
        const now = new Date();
        if (existingReminder.status === "sent" && reminderDateTime > now) {
          existingReminder.status = "pending";
        }
        
        await existingReminder.save();
        console.log(`Updated reminder for task: ${task.title}`);
      } else {
        // Create new reminder
        const newReminder = new Reminder({
          taskId: task._id,
          taskName: task.title,
          description: task.description || "",
          assigneeName: task.assignedTo,
          assigneeEmail: assigneeEmail,
          dueDate: new Date(task.dueDate),
          reminderDate: new Date(task.reminderDate),
          reminderTime: task.reminderTime,
          reminderDateTime: reminderDateTime,
          userId: userId
        });
        
        await newReminder.save();
        console.log(`Created new reminder for task: ${task.title}`);
      }
    } catch (err) {
      console.error("Error handling reminder:", err);
    }
  }
};

// Create a new task
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate, relatedTo, reminderDate, reminderTime } = req.body;

    // Validate required fields
    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ error: "Title, assignedTo, and dueDate are required" });
    }

    const newTask = new Task({
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      relatedTo,
      userId: req.user?.id || DEFAULT_USER_ID, // Use authenticated user ID if available
    });

    const savedTask = await newTask.save();
    
    // Only create reminder if both reminderDate and reminderTime fields are explicitly filled
    if (reminderDate && reminderTime) {
      console.log("Creating reminder for new task - reminder fields filled");
      await handleReminderForTask({
        _id: savedTask._id,
        title,
        description,
        assignedTo,
        dueDate,
        reminderDate,
        reminderTime
      }, req.user?.id || DEFAULT_USER_ID);
    }
    
    res.status(201).json(savedTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

// Get a single task by ID
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
};

// Update a task
export const updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate, relatedTo, reminderDate, reminderTime } = req.body;

    // Find the task before update to compare reminder fields
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, assignedTo, status, priority, dueDate, relatedTo },
      { new: true, runValidators: true }
    );
    
    // Only handle reminder creation/update if the user explicitly filled or modified the reminder fields
    if (reminderDate && reminderTime) {
      console.log("Reminder fields provided in update - processing reminder");
      await handleReminderForTask({
        _id: updatedTask._id,
        title,
        description,
        assignedTo,
        dueDate,
        reminderDate,
        reminderTime
      }, req.user?.id || DEFAULT_USER_ID);
    } else if (req.body.hasOwnProperty('reminderDate') || req.body.hasOwnProperty('reminderTime')) {
      // If the user explicitly cleared the reminder fields, delete any existing reminder
      console.log("Reminder fields were explicitly cleared - removing any existing reminder");
      await Reminder.deleteOne({ taskId: updatedTask._id });
    }
    // Otherwise, don't touch the reminder collection

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Delete associated reminder if it exists
    await Reminder.deleteOne({ taskId: req.params.id });

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

// Get all users for assignedTo dropdown
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email'); // Return name and email fields
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get company names for relatedTo dropdown
export const getCompanies = async (req, res) => {
  try {
    const contacts = await Contact.find().distinct('company');
    // Filter out any null, undefined, or empty values
    const companies = contacts.filter(company => company && company.trim() !== '');
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

// Get all reminders
export const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find().sort({ reminderDateTime: 1 });
    res.status(200).json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
};

// Get pending reminders
export const getPendingReminders = async (req, res) => {
  try {
    const now = new Date();
    const pendingReminders = await Reminder.find({
      reminderDateTime: { $lte: now },
      status: "pending"
    }).sort({ reminderDateTime: 1 });
    
    res.status(200).json(pendingReminders);
  } catch (error) {
    console.error("Error fetching pending reminders:", error);
    res.status(500).json({ error: "Failed to fetch pending reminders" });
  }
};

// Mark a reminder as sent
export const markReminderAsSent = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { status: "sent" },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }
    
    res.status(200).json(reminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({ error: "Failed to update reminder" });
  }
};