import express from "express";
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  deleteLead,
  getContactDetails,
  getPipelineSummary
} from "../controllers/leadController.js";

const router = express.Router();

// Routes for /api/leads
router.route("/")
  .get(getLeads)
  .post(createLead);

// Routes for /api/leads/:id
router.route("/:id")
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

// Route to get pipeline summary
router.get("/pipeline/summary", getPipelineSummary);

// Route to get contact details for a specific contact
router.get("/contact/:id", getContactDetails);

export { router };