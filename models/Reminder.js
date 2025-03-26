import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assigneeName: {
      type: String,
      required: true,
    },
    assigneeEmail: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    reminderDate: {
      type: Date,
      required: true,
    },
    reminderTime: {
      type: String,
      required: true,
    },
    reminderDateTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "cancelled"],
      default: "pending",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of upcoming reminders
reminderSchema.index({ reminderDateTime: 1, status: 1 });

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;