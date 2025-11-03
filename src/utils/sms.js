import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
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

