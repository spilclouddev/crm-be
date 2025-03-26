import Lead from "../models/Lead.js";
import Contact from "../models/Contact.js";
import mongoose from "mongoose";
import { createAuditLog, identifyChanges } from "./leadAuditController.js";

// Placeholder user ID for all leads (no authentication)
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");
const DEFAULT_USER_NAME = "System User"; // Default user name

// Get all leads with contact information
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate("contactPerson", "name email company")
      .sort({ createdAt: -1 });
    
    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
};

// Create a new lead
export const createLead = async (req, res) => {
  try {
    const { contactPerson, value, currencyCode, audValue, stage, priority, notes, leadOwner } = req.body;

    // Validate required fields
    if (!contactPerson || !value) {
      return res
        .status(400)
        .json({ error: "Contact person and value are required" });
    }

    // Verify contact person exists and get company
    const contact = await Contact.findById(contactPerson);
    if (!contact) {
      return res.status(404).json({ error: "Contact person not found" });
    }

    // Use company from the contact
    const company = contact.company;

    const newLead = new Lead({
      contactPerson,
      company, // Use company from contact
      value: Number(value),
      currencyCode: currencyCode || 'AUD',
      audValue: audValue !== undefined ? Number(audValue) : Number(value), // Store AUD value if provided
      stage: stage || "New Lead",
      priority: priority || "Medium",
      notes: notes || "",
      leadOwner: leadOwner || "",
      userId: DEFAULT_USER_ID,
    });

    const savedLead = await newLead.save();
    
    // Create audit log for new lead creation
    await createAuditLog(
      savedLead._id,
      req.user?.id || DEFAULT_USER_ID,
      req.user?.name || DEFAULT_USER_NAME,
      [
        { field: "stage", oldValue: "", newValue: savedLead.stage },
        { field: "priority", oldValue: "", newValue: savedLead.priority },
        { field: "value", oldValue: "", newValue: savedLead.value.toString() },
        { field: "currencyCode", oldValue: "", newValue: savedLead.currencyCode },
        { field: "leadOwner", oldValue: "", newValue: savedLead.leadOwner },
        { field: "notes", oldValue: "", newValue: savedLead.notes }
      ]
    );
    
    // Populate contact person details before returning
    const populatedLead = await Lead.findById(savedLead._id).populate(
      "contactPerson",
      "name email company"
    );
    
    res.status(201).json(populatedLead);
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead" });
  }
};

// Get lead by ID
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate(
      "contactPerson",
      "name email company"
    );

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
};

// Update a lead
export const updateLead = async (req, res) => {
  try {
    const { contactPerson, value, currencyCode, audValue, stage, company, priority, notes, leadOwner } = req.body;
    
    // First, fetch the current lead to compare changes later
    const currentLead = await Lead.findById(req.params.id);
    if (!currentLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    let updateData = {};

    // Convert value to number if it's a string
    if (value !== undefined) {
      const numericValue = typeof value === 'string' ? 
        Number(value.replace(/,/g, '')) : value;
      updateData.value = numericValue;
    }
    
    // Update currency code if provided
    if (currencyCode !== undefined) {
      updateData.currencyCode = currencyCode;
    }
    
    // Add audValue if provided
    if (audValue !== undefined) {
      updateData.audValue = Number(audValue);
    }
    
    if (stage !== undefined) {
      updateData.stage = stage;
    }

    // If company is explicitly provided, use it
    if (company !== undefined) {
      updateData.company = company;
    }

    // Add new fields to update data
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (leadOwner !== undefined) {
      updateData.leadOwner = leadOwner;
    }

    // Verify contact person exists if provided
    if (contactPerson) {
      const contact = await Contact.findById(contactPerson);
      if (!contact) {
        return res.status(404).json({ error: "Contact person not found" });
      }
      
      // Use the contact's company if company not explicitly provided
      updateData.contactPerson = contactPerson;
      if (company === undefined) {
        updateData.company = contact.company;
      }
    }

    // Find and update the lead
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("contactPerson", "name email company");

    if (!updatedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    // Create audit log entry for the changes
    const changes = identifyChanges(currentLead, updatedLead);
    
    if (changes.length > 0) {
      await createAuditLog(
        updatedLead._id,
        req.user?.id || DEFAULT_USER_ID,
        req.user?.name || DEFAULT_USER_NAME,
        changes
      );
    }

    res.status(200).json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Failed to update lead" });
  }
};

// Delete a lead
export const deleteLead = async (req, res) => {
  try {
    const deletedLead = await Lead.findByIdAndDelete(req.params.id);

    if (!deletedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    // Create audit log for lead deletion
    await createAuditLog(
      deletedLead._id,
      req.user?.id || DEFAULT_USER_ID,
      req.user?.name || DEFAULT_USER_NAME,
      [{ field: "status", oldValue: "Active", newValue: "Deleted" }]
    );

    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
};

// Get contact details for lead form
export const getContactDetails = async (req, res) => {
    try {
      const contactId = req.params.id;
      
      // Validate that contact ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(contactId)) {
        console.log(`Invalid contact ID format: ${contactId}`);
        return res.status(400).json({ error: "Invalid contact ID format" });
      }
      
      const contact = await Contact.findById(contactId);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.status(200).json({
        _id: contact._id,
        name: contact.name,
        company: contact.company
      });
    } catch (error) {
      console.error("Error fetching contact details:", error);
      res.status(500).json({ error: "Failed to fetch contact details" });
    }
  };

// Get sales pipeline summary
export const getPipelineSummary = async (req, res) => {
  try {
    // Use audValue for pipeline calculations
    const pipelineData = await Lead.aggregate([
      {
        $group: {
          _id: "$stage",
          totalValue: { $sum: "$audValue" }, // Use audValue for total
          count: { $sum: 1 },
          leads: { 
            $push: { 
              id: "$_id", 
              company: "$company", 
              value: "$audValue" // Use audValue for individual leads
            } 
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.status(200).json(pipelineData);
  } catch (error) {
    console.error("Error fetching pipeline summary:", error);
    res.status(500).json({ error: "Failed to fetch pipeline summary" });
  }
};