import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Lazily initialize Twilio client so the app doesn't crash at import time when
// environment variables are missing. sendTicketSMS will return an informative
// error if Twilio isn't configured.
let client = null;
const getTwilioClient = () => {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn('Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to enable SMS sending.');
    return null;
  }
  client = twilio(sid, token);
  return client;
};

export const sendTicketSMS = async (phoneNumber, bookingDetails) => {
  try {
    const { ticketId, movieTitle, showTime, seats, totalAmount, showDate } = bookingDetails;
    
    const message = `🎬 CINE-BOOK Ticket Confirmation

Ticket ID: ${ticketId}
Movie: ${movieTitle}
Date: ${new Date(showDate).toLocaleDateString()}
Time: ${showTime}
Seats: ${seats.join(', ')}
Total: ₹${totalAmount}

Thank you for booking with CINE-BOOK!
Enjoy your movie! 🍿`;

    // If Twilio client cannot be created because credentials are missing,
    // return a descriptive error instead of throwing at import time.
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      const errMsg = 'Twilio not configured: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment';
      console.error('SMS sending failed:', errMsg);
      return { success: false, error: errMsg };
    }

    // Choose Twilio sender config: prefer Messaging Service SID, else From phone number
    const hasMessagingServiceSid = Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID);
    const hasFromNumber = Boolean(process.env.TWILIO_PHONE_NUMBER);

    if (!hasMessagingServiceSid && !hasFromNumber) {
      throw new Error("Twilio configuration missing: set TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID in .env");
    }

    const senderConfig = hasMessagingServiceSid
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_PHONE_NUMBER };

    const result = await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      ...senderConfig
    });

    console.log('SMS sent successfully:', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  // Placeholder for email service integration
  console.log('Email confirmation would be sent to:', email);
  console.log('Booking details:', bookingDetails);
  return { success: true };
};

