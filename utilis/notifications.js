// utils/notifications.js

module.exports = {
    sendEmailNotification: (email, subject, message) => {
      // Placeholder function – integrate with nodemailer or similar
      console.log(`Sending email to ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      // In production, you'd call an email service here
    },
  
    logNotification: (userId, message) => {
      // Log notifications to the DB or file
      console.log(`User ${userId} - Notification: ${message}`);
      // You could insert this into a 'notifications' table if needed
    }
  };
  