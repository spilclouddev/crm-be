import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import { router as leadRoutes } from "./routes/leadRoutes.js";
import taskRoutes from './routes/taskRoutes.js';


// Load environment variables first
dotenv.config();

// Initialize express app
const app = express();
app.use(express.json());

// Configure CORS
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/leads", leadRoutes);
app.use('/api/tasks', taskRoutes);

// Start the reminder scheduler if not in test mode
try {
  if (process.env.NODE_ENV !== 'test') {
    const started = startReminderScheduler();
    if (started) {
      console.log('Reminder scheduler started - will check for due reminders every minute and send emails');
    } else {
      console.log('Reminder scheduler failed to start');
    }
  }
} catch (error) {
  console.error('Error starting reminder scheduler:', error);
  console.log('API will continue to run without reminder scheduler');
}

// Simple health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong!", 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;