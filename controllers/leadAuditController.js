//import LeadAuditLog from "../models/LeadAuditLog.js";
import leadAuditLog from "../models/leadAuditLogmodel/leadAuditLog.js"
import Contact from "../models/Contact.js";
import mongoose from "mongoose";

// Get audit logs for a specific lead
export const getLeadAuditLogs = async (req, res) => {
  try {
    const leadId = req.params.id;
    
    // Validate if the lead ID is valid
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID format" });
    }
    
    // Fetch audit logs for the lead, sorted by most recent first
    const auditLogs = await leadAuditLog.find({ leadId })
      .sort({ timestamp: -1 })
      .exec();
    
    res.status(200).json(auditLogs);
  } catch (error) {
    console.error("Error fetching lead audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

// Create an audit log entry when a lead is updated
export const createAuditLog = async (leadId, userId, userName, changes) => {
  try {
    // Only create an audit log if there are actual changes
    if (!changes || changes.length === 0) {
      return null;
    }
    
    // Process contactPerson changes for better readability
    const processedChanges = await Promise.all(changes.map(async (change) => {
      // If this is a contactPerson change
      if (change.field === 'contactPerson') {
        return await processContactPersonChange(change);
      }
      return change;
    }));
    
    const auditLog = new leadAuditLog({
      leadId,
      userId,
      userName,
      timestamp: new Date(),
      changes: processedChanges
    });
    
    return await auditLog.save();
  } catch (error) {
    console.error("Error creating audit log:", error);
    return null;
  }
};

// Helper function to process contactPerson changes
async function processContactPersonChange(change) {
  try {
    // Handle old value - if it's a valid MongoDB ID, fetch contact details
    if (mongoose.Types.ObjectId.isValid(change.oldValue)) {
      const oldContact = await Contact.findById(change.oldValue);
      if (oldContact) {
        change.oldValue = oldContact.name || change.oldValue;
      }
    }
    
    // Handle new value - if it's a valid MongoDB ID, fetch contact details
    if (mongoose.Types.ObjectId.isValid(change.newValue)) {
      const newContact = await Contact.findById(change.newValue);
      if (newContact) {
        change.newValue = newContact.name || change.newValue;
      }
    }
    
    return change;
  } catch (error) {
    console.error("Error processing contact person change:", error);
    return change; // Return original change if there's an error
  }
}

// Helper function to compare old and new lead objects and identify changes
export const identifyChanges = (oldLead, newLead) => {
  const changes = [];
  
  // Fields to track in audit log
  const fieldsToTrack = [
    "stage",
    "priority",
    "value",
    "notes",
    "leadOwner",
    "contactPerson"
  ];
  
  for (const field of fieldsToTrack) {
    // Special handling for contactPerson which is an ObjectId reference
    if (field === "contactPerson") {
      const oldValue = oldLead[field] ? oldLead[field].toString() : null;
      const newValue = newLead[field] ? newLead[field].toString() : null;
      
      if (oldValue !== newValue) {
        changes.push({
          field,
          oldValue: oldValue || "",
          newValue: newValue || ""
        });
      }
      continue;
    }
    
    // For all other fields
    if (oldLead[field] !== newLead[field]) {
      changes.push({
        field,
        oldValue: oldLead[field] !== undefined ? oldLead[field].toString() : "",
        newValue: newLead[field] !== undefined ? newLead[field].toString() : ""
      });
    }
  }
  
  return changes;
};