import Reminder from "../models/Reminder.js";
import nodemailer from "nodemailer";
import cron from "node-cron";

// Configure nodemailer
const transporter = nodemailer.createTransport({
  // Replace with your email configuration
  host: process.env.EMAIL_HOST || "smtp.example.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "user@example.com",
    pass: process.env.EMAIL_PASSWORD || "password",
  },
});

// Function to check and process due reminders
export const processDueReminders = async () => {
  try {
    const now = new Date();
    console.log(`Checking for due reminders at ${now.toISOString()}...`);
    
    // Find all pending reminders that have reached their reminder time
    const dueReminders = await Reminder.find({
      reminderDateTime: { $lte: now },
      status: "pending"
    });
    
    console.log(`Found ${dueReminders.length} due reminders`);
    
    for (const reminder of dueReminders) {
      try {
        console.log(`Processing reminder for task: ${reminder.taskName}`);
        
        // Skip sending if no email available
        if (!reminder.assigneeEmail) {
          console.log(`No email available for ${reminder.assigneeName}, skipping email notification`);
        } else {
          // Send email notification
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Task Reminder" <noreply@example.com>',
            to: reminder.assigneeEmail,
            subject: `Reminder: ${reminder.taskName}`,
            html: `
              <h2>Task Reminder</h2>
              <p><strong>Task:</strong> ${reminder.taskName}</p>
              <p><strong>Description:</strong> ${reminder.description || "N/A"}</p>
              <p><strong>Due Date:</strong> ${reminder.dueDate.toLocaleDateString()}</p>
              <p>Please log in to the system to check task details.</p>
            `,
          });
          
          console.log(`Email sent to ${reminder.assigneeEmail}`);
        }
        
        // IMPORTANT: Don't automatically mark as sent here
        // Let the frontend handle marking as sent after user sees the notification
        // This ensures the notification will appear in the UI
        
        // Note: The following code is commented out to preserve the pending status
        // reminder.status = "sent";
        // await reminder.save();
        
        console.log(`Reminder processed for task: ${reminder.taskName}`);
      } catch (err) {
        console.error(`Error processing reminder for task ${reminder.taskName}:`, err);
      }
    }
  } catch (error) {
    console.error("Error in processDueReminders:", error);
  }
};

// Schedule to run every minute
export const startReminderService = () => {
  console.log("Starting reminder service...");
  cron.schedule("* * * * *", processDueReminders);
};

export default { processDueReminders, startReminderService };