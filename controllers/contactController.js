import Contact from "../models/Contact.js";
import mongoose from "mongoose";

// Placeholder user ID for all contacts (no authentication)
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

// Get all contacts (no user filtering)
export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({
      createdAt: -1,
    });
    res.status(200).json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

// Create a new contact
export const createContact = async (req, res) => {
  try {
    // Extract data from request body
    const { 
      contactType, 
      companyName, 
      companyAddress, 
      additionalDetails,
      companyEmail,
      phoneNumber,
      website,
      contactPersons,
      attachments,
      // Maintain backward compatibility
      name,
      email,
      phone,
      company
    } = req.body;

    // Validate required fields
    if (!companyName && !company) {
      return res.status(400).json({ error: "Company name is required" });
    }
    
    if (!companyEmail && !email) {
      return res.status(400).json({ error: "Company email is required" });
    }
    
    if (!phoneNumber && !phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Create contact object with new fields structure
    const contactData = {
      userId: DEFAULT_USER_ID,
      
      // Set fields with proper fallbacks for backward compatibility
      contactType,
      companyName: companyName || company,
      companyAddress,
      additionalDetails,
      companyEmail: companyEmail || email,
      phoneNumber: phoneNumber || phone,
      website,
      contactPersons,
      attachments,
      
      // Also save old fields for backward compatibility
      name: name || (contactPersons && contactPersons.length > 0 ? contactPersons[0].name : ''),
      email: email || companyEmail,
      phone: phone || phoneNumber,
      company: company || companyName
    };

    const newContact = new Contact(contactData);
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact: " + error.message });
  }
};

// Get a single contact by ID
export const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
};

// Update a contact
export const updateContact = async (req, res) => {
  try {
    // Extract data from request body
    const { 
      contactType, 
      companyName, 
      companyAddress, 
      additionalDetails,
      companyEmail,
      phoneNumber,
      website,
      contactPersons,
      attachments,
      // Maintain backward compatibility
      name,
      email,
      phone,
      company
    } = req.body;

    // Prepare update data with proper structure
    const updateData = {
      contactType,
      companyName: companyName || company,
      companyAddress,
      additionalDetails,
      companyEmail: companyEmail || email,
      phoneNumber: phoneNumber || phone,
      website,
      contactPersons,
      attachments,
      
      // Also update old fields for backward compatibility
      name: name || (contactPersons && contactPersons.length > 0 ? contactPersons[0].name : undefined),
      email: email || companyEmail,
      phone: phone || phoneNumber,
      company: company || companyName
    };

    // Remove undefined fields to avoid overwriting with null
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact: " + error.message });
  }
};

// Delete a contact
export const deleteContact = async (req, res) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);

    if (!deletedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

// Upload files (for company logo and attachments)
export const uploadFiles = async (req, res) => {
  try {
    // This would process file uploads using a middleware like multer
    // For this example, we'll assume req.files contains the uploaded files
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }
    
    const fileResponses = [];
    
    // Process each uploaded file
    for (const key in req.files) {
      const file = req.files[key];
      
      // Here you would save the file to your storage (local, S3, etc.)
      // For demonstration, we'll just create a response with file details
      
      fileResponses.push({
        fileName: file.name,
        fileType: file.mimetype,
        filePath: `/uploads/${file.name}`, // This would be the actual saved path
        fileSize: file.size,
        uploadedAt: new Date()
      });
    }
    
    res.status(200).json(fileResponses);
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
};