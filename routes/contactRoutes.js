import express from "express";
import {
  getContacts,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
  uploadFiles
} from "../controllers/contactController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Routes for /api/contacts
router.route("/")
  .get(authMiddleware, getContacts)
  .post(authMiddleware, createContact);

// Routes for /api/contacts/:id
router.route("/:id")
  .get(authMiddleware, getContactById)
  .put(authMiddleware, updateContact)
  .delete(authMiddleware, deleteContact);

// Route for file uploads
router.route("/upload")
  .post(authMiddleware, uploadFiles);

export default router;