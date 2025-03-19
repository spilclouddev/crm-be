import express from "express";
import {
  getContacts,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
} from "../controllers/contactController.js";

const router = express.Router();

// Routes for /api/contacts
router.route("/")
  .get(getContacts)
  .post(createContact);

// Routes for /api/contacts/:id
router.route("/:id")
  .get(getContactById)
  .put(updateContact)
  .delete(deleteContact);

export default router;