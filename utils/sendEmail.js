import nodemailer from "nodemailer";

const sendEmail = async (to, subject, text) => {
  try {
    // Create a transporter using Gmail's SMTP server
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // Define email options
    const mailOptions = {
      from: `"CRM System" <${process.env.GMAIL_USER}>`,
      to, // Can be any email address, including corporate emails
      subject,
      text,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default sendEmail;