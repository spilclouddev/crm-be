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
    console.log("Create lead request body:", req.body); // Log the request body for debugging
    
    const { 
      contactPerson, 
      contactPersonName,
      isManualEntry, 
      company, 
      country,
      value, 
      currencyCode, 
      audValue, 
      stage, 
      priority, 
      notes, 
      nextStep,
      leadOwner 
    } = req.body;

    // Validate required fields
    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }

    let contactPersonId = null;
    let contactPersonNameValue = null;
    let companyName = company;

    // Handle different types of contact person data
    if (isManualEntry) {
      // For manual entry, we expect a contactPersonName from the form
      // Use either contactPersonName or contactPerson field (depending on how the form is submitting)
      contactPersonNameValue = contactPersonName || contactPerson;
      
      if (!contactPersonNameValue) {
        return res.status(400).json({ error: "Contact person name is required for manual entry" });
      }
      
      if (!company) {
        return res.status(400).json({ error: "Company name is required for manual entry" });
      }
      
      // For manual entry, contactPerson reference remains null
      contactPersonId = null;
    } else {
      // For dropdown selection, verify that the contact person exists
      if (!contactPerson) {
        return res.status(400).json({ error: "Contact person is required for dropdown selection" });
      }

      try {
        // Make sure contactPerson is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(contactPerson)) {
          return res.status(400).json({ error: "Invalid contact person ID format" });
        }
        
        // Verify contact person exists and get company
        const contact = await Contact.findById(contactPerson);
        if (!contact) {
          return res.status(404).json({ error: "Contact person not found" });
        }
        
        // Use company from the contact if not provided
        contactPersonId = contact._id;
        companyName = company || contact.company;
      } catch (error) {
        console.error("Error finding contact:", error);
        return res.status(500).json({ error: "Failed to verify contact person" });
      }
    }

    try {
      const newLead = new Lead({
        contactPerson: contactPersonId,
        contactPersonName: contactPersonNameValue,
        isManualEntry: !!isManualEntry,
        company: companyName,
        country: country || 'Australia', // Default to Australia if not provided
        value: Number(value),
        currencyCode: currencyCode || 'AUD',
        audValue: audValue !== undefined ? Number(audValue) : Number(value), // Store AUD value if provided
        stage: stage || "New Lead",
        priority: priority || "Medium",
        notes: notes || "",
        nextStep: nextStep || "", // Ensure nextStep is stored
        leadOwner: leadOwner || "",
        userId: DEFAULT_USER_ID,
      });

      console.log("Attempting to save lead:", newLead); // Log the lead being saved
      
      const savedLead = await newLead.save();
      console.log("Lead saved successfully:", savedLead);
      
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
          { field: "country", oldValue: "", newValue: savedLead.country },
          { field: "nextStep", oldValue: "", newValue: savedLead.nextStep },
          { field: "leadOwner", oldValue: "", newValue: savedLead.leadOwner },
          { field: "notes", oldValue: "", newValue: savedLead.notes }
        ]
      );
      
      // For manually entered contacts, we don't need to populate
      // For referenced contacts, populate contact person details
      let populatedLead;
      
      if (isManualEntry) {
        populatedLead = savedLead;
      } else {
        populatedLead = await Lead.findById(savedLead._id).populate(
          "contactPerson",
          "name email company"
        );
      }
      
      res.status(201).json(populatedLead);
    } catch (saveError) {
      console.error("Error saving lead:", saveError);
      // Better error message for validation failures
      if (saveError.name === 'ValidationError') {
        const errors = Object.keys(saveError.errors).map(key => {
          return {field: key, message: saveError.errors[key].message};
        });
        return res.status(400).json({ 
          error: "Validation error", 
          details: errors
        });
      }
      res.status(500).json({ error: "Failed to create lead: " + saveError.message });
    }
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead: " + error.message });
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
    console.log("Update lead request body:", req.body); // Log request for debugging
    
    const { 
      contactPerson, 
      contactPersonName,
      isManualEntry, 
      company, 
      country, 
      value, 
      currencyCode, 
      audValue, 
      stage, 
      priority, 
      notes, 
      nextStep,
      leadOwner 
    } = req.body;
    
    // First, fetch the current lead to compare changes later
    const currentLead = await Lead.findById(req.params.id);
    if (!currentLead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    
    // Deep clone the current lead to avoid mutation
    const existingLead = JSON.parse(JSON.stringify(currentLead));
    
    let updateData = {
      isManualEntry: isManualEntry !== undefined ? !!isManualEntry : existingLead.isManualEntry
    };

    // Convert value to number if it's a string
    if (value !== undefined) {
      const numericValue = typeof value === 'string' ? 
        Number(value.replace(/[^0-9.-]+/g, '')) : value;
      updateData.value = numericValue;
    }
    
    // Update country if provided
    if (country !== undefined) {
      updateData.country = country;
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

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    // Update nextStep if provided
    if (nextStep !== undefined) {
      updateData.nextStep = nextStep;
    }

    if (leadOwner !== undefined) {
      updateData.leadOwner = leadOwner;
    }

    // Update company regardless of entry mode
    if (company !== undefined) {
      updateData.company = company;
    }

    // Handle different contact person data based on entry mode
    if (updateData.isManualEntry) {
      // For manual entry, store name as string and clear the reference
      updateData.contactPerson = null;
      
      // Use contactPersonName if provided, otherwise use contactPerson field
      // (depends on how the form is submitting the data)
      if (contactPersonName !== undefined) {
        updateData.contactPersonName = contactPersonName;
      } else if (typeof contactPerson === 'string' && !mongoose.Types.ObjectId.isValid(contactPerson)) {
        // If contactPerson is a string but not a valid ObjectId, treat it as a name
        updateData.contactPersonName = contactPerson;
      } else if (!existingLead.contactPersonName && !contactPersonName) {
        // Only return an error if we don't have any contact name
        return res.status(400).json({ 
          error: "Validation error", 
          details: [{ field: "contactPersonName", message: "Contact person name is required for manual entries" }]
        });
      }
    } else {
      // For dropdown selection, verify contact exists
      if (contactPerson && mongoose.Types.ObjectId.isValid(contactPerson)) {
        try {
          const contact = await Contact.findById(contactPerson);
          if (!contact) {
            return res.status(404).json({ error: "Contact person not found" });
          }
          
          // Store the ID reference and clear the manual name
          updateData.contactPerson = contact._id;
          updateData.contactPersonName = null;
          
          // Use the contact's company if company not explicitly provided
          if (company === undefined) {
            updateData.company = contact.company;
          }
        } catch (error) {
          console.error("Error finding contact:", error);
          return res.status(500).json({ error: "Failed to verify contact person" });
        }
      } else if (!contactPerson && !existingLead.contactPerson) {
        // Only return error if this is a non-manual entry with no contact
        return res.status(400).json({ 
          error: "Validation error", 
          details: [{ field: "contactPerson", message: "Contact person is required for dropdown selection" }]
        });
      }
    }

    console.log("Updating lead with data:", updateData);

    try {
      // Find and update the lead with runValidators false to avoid validation issues on update
      const updatedLead = await Lead.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: false }
      ).populate("contactPerson", "name email company");

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      console.log("Lead updated successfully:", updatedLead);
      
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
    } catch (updateError) {
      console.error("Error updating lead:", updateError);
      // Better error message for validation failures
      if (updateError.name === 'ValidationError') {
        const errors = Object.keys(updateError.errors).map(key => {
          return {field: key, message: updateError.errors[key].message};
        });
        return res.status(400).json({ 
          error: "Validation error", 
          details: errors
        });
      }
      res.status(500).json({ error: "Failed to update lead: " + updateError.message });
    }
  } catch (error) {
    console.error("Error in update lead process:", error);
    res.status(500).json({ error: "Failed to update lead: " + error.message });
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