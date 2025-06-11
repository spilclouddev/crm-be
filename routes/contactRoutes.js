import express from "express";
import {
  getContacts,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
  uploadCompanyLogo,
  deleteCompanyLogo,
  uploadAttachments,
  deleteAttachment,
  upload
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

// Company logo upload routes
router.route("/:id/logo")
  .post(authMiddleware, upload.single('companyLogo'), uploadCompanyLogo)
  .delete(authMiddleware, deleteCompanyLogo);

// Attachment upload routes
router.route("/:id/attachments")
  .post(authMiddleware, upload.array('attachments', 10), uploadAttachments);

// Delete specific attachment
router.route("/:id/attachments/:attachmentId")
  .delete(authMiddleware, deleteAttachment);

// Legacy route for file uploads (backward compatibility)
router.route("/upload")
  .post(authMiddleware, upload.array('files', 10), uploadAttachments);

export default router;