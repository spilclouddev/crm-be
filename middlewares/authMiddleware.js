import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Check for token in headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. No valid token provided." });
    }
    
    const token = authHeader.split(" ")[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_for_development");
      
      // Find user by ID from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ error: "Invalid token. User not found." });
      }
      
      // Attach user to request object
      req.user = user;
      
      // Continue to next middleware or route handler
      next();
    } catch (tokenError) {
      // Handle token expiration more gracefully
      if (tokenError.name === "TokenExpiredError") {
        return res.status(401).json({ 
          error: "Token expired. Please log in again.", 
          code: "TOKEN_EXPIRED" 
        });
      }
      
      if (tokenError.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          error: "Invalid token. Please log in again.", 
          code: "INVALID_TOKEN" 
        });
      }
      
      // Unexpected token error
      return res.status(401).json({ 
        error: "Authentication failed. Please log in again.", 
        code: "AUTH_FAILED" 
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Server error in authentication." });
  }
};

export default authMiddleware;