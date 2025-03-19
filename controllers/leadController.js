import Lead from "../models/Lead.js";
import Contact from "../models/Contact.js";
import mongoose from "mongoose";

// Placeholder user ID for all leads (no authentication)
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

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
    const { contactPerson, value, stage } = req.body;

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
      stage: stage || "New Lead",
      userId: DEFAULT_USER_ID,
    });

    const savedLead = await newLead.save();
    
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
    const { contactPerson, value, stage, company } = req.body;
    let updateData = {};

    // Convert value to number if it's a string
    if (value !== undefined) {
      const numericValue = typeof value === 'string' ? 
        Number(value.replace(/,/g, '')) : value;
      updateData.value = numericValue;
    }
    
    if (stage !== undefined) {
      updateData.stage = stage;
    }

    // If company is explicitly provided, use it
    if (company !== undefined) {
      updateData.company = company;
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
    const pipelineData = await Lead.aggregate([
      {
        $group: {
          _id: "$stage",
          totalValue: { $sum: "$value" },
          count: { $sum: 1 },
          leads: { $push: { id: "$_id", company: "$company", value: "$value" } }
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