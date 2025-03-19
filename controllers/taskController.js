import Task from "../models/Task.js";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import mongoose from "mongoose";

// Placeholder user ID for tasks created without authentication
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

// Get all tasks
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

// Create a new task
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate, relatedTo } = req.body;

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
      userId: DEFAULT_USER_ID, // Use default user ID for now
    });

    const savedTask = await newTask.save();
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
    const { title, description, assignedTo, status, priority, dueDate, relatedTo } = req.body;

    // Find and update the task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, assignedTo, status, priority, dueDate, relatedTo },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

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

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

// Get all users for assignedTo dropdown
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('name'); // Only return the name field
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