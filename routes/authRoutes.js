import express from "express";
import { 
  signup, 
  login, 
  forgotPassword, 
  resetPassword,
  getCurrentUser // Add this new controller
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected route to get current user info
router.get("/me", authMiddleware, getCurrentUser);

export default router;