import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Improved connectDB function
const connectDB = async () => {
  try {
    // Verify MongoDB URI is provided
    if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === '') {
      throw new Error("MongoDB URI is not set in environment variables");
    }
    
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, options);
    
    // Drop the problematic index if it exists
    try {
      const User = mongoose.connection.collection('users');
      await User.dropIndex('username_1');
      console.log('Dropped legacy username index');
    } catch (indexError) {
      // Index might not exist, which is fine
      console.log('No legacy index to drop or already dropped');
    }
    
    console.log("MongoDB Connected Successfully");
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, attempting to reconnect...');
    });
    
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;