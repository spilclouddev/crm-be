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
import { getLeadAuditLogs } from "../controllers/leadAuditController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Routes for /api/leads
router.route("/")
  .get(authMiddleware, getLeads)
  .post(authMiddleware, createLead);

// Routes for /api/leads/:id
router.route("/:id")
  .get(authMiddleware, getLeadById)
  .put(authMiddleware, updateLead)
  .delete(authMiddleware, deleteLead);

// Route to get pipeline summary
router.get("/pipeline/summary", authMiddleware, getPipelineSummary);

// Route to get contact details for a specific contact
router.get("/contact/:id", authMiddleware, getContactDetails);

// New route to get audit logs for a specific lead
router.get("/audit/:id", authMiddleware, getLeadAuditLogs);

export { router };