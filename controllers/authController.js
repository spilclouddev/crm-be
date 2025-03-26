import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// Generate JWT Token with longer expiry
const generateToken = (id) => {
  // Use a fallback secret if JWT_SECRET is not set
  const secret = process.env.JWT_SECRET || "fallback_secret_for_development";
  
  // Increase token expiry from 7d to 30d to prevent frequent expirations
  return jwt.sign({ id }, secret, { expiresIn: "30d" });
};

// Signup Controller
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "User already exists" });

    user = await User.create({ name, email, password });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);
    
    res.json({ 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password Controller
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail(user.email, "Password Reset", `Reset your password here: ${resetURL}`);

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password Controller
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Current User Controller
export const getCurrentUser = async (req, res) => {
  try {
    // User information is already attached to the request by the auth middleware
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return user data (excluding sensitive information)
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      // Add any other fields you want to return
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};