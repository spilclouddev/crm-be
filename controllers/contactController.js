import Contact from "../models/Contact.js";
import mongoose from "mongoose";
import cloudinary from '../config/cloudinaryConfig.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Placeholder user ID for all contacts (no authentication)
const DEFAULT_USER_ID = new mongoose.Types.ObjectId("000000000000000000000000");

// Set up multer for temporary file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

// Configure multer upload
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    // For company logo, only allow images
    if (file.fieldname === 'companyLogo') {
      const imageTypes = /jpeg|jpg|png|gif|webp/;
      const mimetype = imageTypes.test(file.mimetype);
      const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only image files allowed for company logo'));
    } else {
      // For attachments, allow various file types
      const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|webp/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only supported file formats allowed'));
    }
  }
});

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
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Delete company logo from Cloudinary if it exists
    if (contact.companyLogo && contact.companyLogo.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(contact.companyLogo.cloudinaryId);
      } catch (error) {
        console.error('Error deleting company logo from Cloudinary:', error);
      }
    }

    // Delete attachments from Cloudinary if they exist
    if (contact.attachments && contact.attachments.length > 0) {
      for (const attachment of contact.attachments) {
        if (attachment.cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(attachment.cloudinaryId);
          } catch (error) {
            console.error('Error deleting attachment from Cloudinary:', error);
          }
        }
      }
    }

    await contact.deleteOne();
    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

// Upload company logo
export const uploadCompanyLogo = async (req, res) => {
  try {
    console.log('Upload company logo request received for contact ID:', req.params.id);
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      // Clean up temp file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Contact not found" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log(`Processing company logo upload: ${req.file.originalname}`);
    
    try {
      // Delete existing logo from Cloudinary if it exists
      if (contact.companyLogo && contact.companyLogo.cloudinaryId) {
        await cloudinary.uploader.destroy(contact.companyLogo.cloudinaryId);
        console.log(`Deleted existing logo: ${contact.companyLogo.cloudinaryId}`);
      }
      
      // Upload new logo to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'contacts/logos',
        resource_type: 'image',
        public_id: `${req.params.id}/logo-${Date.now()}`,
        transformation: [
          { width: 300, height: 300, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });
      
      console.log(`Cloudinary upload successful: ${result.public_id}`);
      
      // Remove temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`Temporary file removed: ${req.file.path}`);
      }
      
      // Update contact with new logo
      const logoData = {
        fileName: req.file.originalname,
        filePath: result.secure_url,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        cloudinaryId: result.public_id,
        uploadedAt: new Date()
      };
      
      contact.companyLogo = logoData;
      await contact.save();
      
      console.log('Company logo updated successfully');
      res.status(200).json(contact);
    } catch (uploadError) {
      // Clean up temp file in case of error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('Logo upload error:', uploadError);
      res.status(500).json({ error: `Error uploading logo: ${uploadError.message}` });
    }
  } catch (error) {
    console.error("Error in uploadCompanyLogo:", error);
    res.status(500).json({ error: "Failed to upload company logo" });
  }
};

// Delete company logo
export const deleteCompanyLogo = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    if (!contact.companyLogo) {
      return res.status(404).json({ error: "No company logo found" });
    }
    
    // Delete from Cloudinary if cloudinaryId exists
    if (contact.companyLogo.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(contact.companyLogo.cloudinaryId);
        console.log(`Deleted logo from Cloudinary: ${contact.companyLogo.cloudinaryId}`);
      } catch (error) {
        console.error('Error deleting logo from Cloudinary:', error);
      }
    }
    
    // Remove logo from contact
    contact.companyLogo = undefined;
    await contact.save();
    
    res.status(200).json(contact);
  } catch (error) {
    console.error("Error deleting company logo:", error);
    res.status(500).json({ error: "Failed to delete company logo" });
  }
};

// Upload attachments
export const uploadAttachments = async (req, res) => {
  try {
    console.log('Upload attachments request received for contact ID:', req.params.id);
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      // Clean up temp files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ error: "Contact not found" });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    
    console.log(`Processing ${req.files.length} files for upload`);
    
    try {
      const uploadPromises = req.files.map(async (file) => {
        console.log(`Uploading file: ${file.originalname} (${file.mimetype})`);
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'contacts/attachments',
          resource_type: 'auto',
          public_id: `${req.params.id}/${path.parse(file.originalname).name}-${Date.now()}`
        });
        
        console.log(`Cloudinary upload successful: ${result.public_id}`);
        
        // Remove temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`Temporary file removed: ${file.path}`);
        }
        
        return {
          fileName: file.originalname,
          filePath: result.secure_url,
          fileType: file.mimetype,
          fileSize: file.size,
          cloudinaryId: result.public_id,
          uploadedAt: new Date()
        };
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${uploadedFiles.length} files`);
      
      // Add the new attachments to the contact
      contact.attachments = [...(contact.attachments || []), ...uploadedFiles];
      await contact.save();
      
      res.status(200).json(contact);
    } catch (uploadError) {
      // Clean up any temp files in case of error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      console.error('File upload error:', uploadError);
      res.status(500).json({ error: `Error uploading files: ${uploadError.message}` });
    }
  } catch (error) {
    console.error("Error in uploadAttachments:", error);
    res.status(500).json({ error: "Failed to upload attachments" });
  }
};

// Delete attachment
export const deleteAttachment = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    // Find the attachment by ID
    const attachmentIndex = contact.attachments.findIndex(
      att => att._id.toString() === req.params.attachmentId
    );
    
    if (attachmentIndex === -1) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    
    const attachment = contact.attachments[attachmentIndex];
    
    // Delete from Cloudinary if cloudinaryId exists
    if (attachment.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(attachment.cloudinaryId);
        console.log(`Deleted attachment from Cloudinary: ${attachment.cloudinaryId}`);
      } catch (error) {
        console.error('Error deleting attachment from Cloudinary:', error);
      }
    }
    
    // Remove from array
    contact.attachments.splice(attachmentIndex, 1);
    await contact.save();
    
    res.status(200).json(contact);
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};

// Export upload middleware and functions
export { upload };
export const uploadFiles = uploadAttachments; // For backward compatibility