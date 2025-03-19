import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// In your db.js file, modify the connectDB function
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tlsAllowInvalidCertificates: true
    });
    
    // Drop the problematic index if it exists
    try {
      const User = mongoose.connection.collection('users');
      await User.dropIndex('username_1');
      console.log('Dropped legacy username index');
    } catch (indexError) {
      // Index might not exist, which is fine
      console.log('No legacy index to drop or already dropped');
    }
    
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
