import Reminder from "../models/Reminder.js";
import User from "../models/User.js";

// Get pending notifications that should be shown to users
export const getPendingNotifications = async (req, res) => {
  try {
    // Get current user from authentication middleware
    const userId = req.user.id;
    
    // Find the current user to get their username
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const now = new Date();
    
    // Find only reminders assigned to the current user
    const dueReminders = await Reminder.find({
      reminderDateTime: { $lte: now },
      status: "pending",
      assigneeName: currentUser.name // Filter by the user's name
    }).sort({ reminderDateTime: 1 });
    
    console.log(`Found ${dueReminders.length} due reminders for user ${currentUser.name}`);
    
    // Transform reminders into notification format with consistent ID types
    const notifications = dueReminders.map(reminder => ({
      id: `reminder-${reminder._id.toString()}`,
      title: `Reminder: ${reminder.taskName}`,
      message: `${reminder.description || ""}. Due: ${new Date(reminder.dueDate).toLocaleDateString()}.`,
      timestamp: "Just now",
      read: false,
      taskId: reminder.taskId.toString(),
      reminderId: reminder._id.toString()
    }));
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching pending notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Mark a reminder as sent/processed after frontend has shown it
export const markNotificationProcessed = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const userId = req.user.id;
    
    // Verify the reminder belongs to this user before updating
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const reminder = await Reminder.findOne({
      _id: reminderId,
      assigneeName: currentUser.name
    });
    
    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found or not assigned to you" });
    }
    
    // Update the reminder status
    reminder.status = "sent";
    await reminder.save();
    
    res.status(200).json({ message: "Notification marked as processed" });
  } catch (error) {
    console.error("Error updating reminder status:", error);
    res.status(500).json({ error: "Failed to update reminder status" });
  }
};