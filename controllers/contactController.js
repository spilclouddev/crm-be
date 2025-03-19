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
    const { name, email, phone, company } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ error: "Name, email, and phone are required" });
    }

    const newContact = new Contact({
      name,
      email,
      phone,
      company,
      userId: DEFAULT_USER_ID, // Use default user ID
    });

    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
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
    const { name, email, phone, company } = req.body;

    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, company },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
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