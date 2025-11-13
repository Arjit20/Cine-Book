import nodemailer from 'nodemailer';

// Remove spaces from app password
const emailPass = process.env.EMAIL_PASS?.replace(/\s/g, '');

console.log('Email config:', {
  user: process.env.EMAIL_USER,
  passLength: emailPass?.length
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email service on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service verification failed:', error);
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

export const sendBookingConfirmation = async (email, ticketDetails) => {
  console.log('Attempting to send email to:', email, 'Ticket:', ticketDetails.ticketId);
  
  const mailOptions = {
    from: `"CineBook Tickets" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎬 Booking Confirmation - ${ticketDetails.ticketId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2196F3; text-align: center;">🎬 Booking Confirmed!</h1>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="font-size: 16px; margin: 10px 0;"><strong>🎫 Ticket ID:</strong> ${ticketDetails.ticketId}</p>
          <p style="font-size: 16px; margin: 10px 0;"><strong>🎥 Movie:</strong> ${ticketDetails.movieTitle}</p>
          <p style="font-size: 16px; margin: 10px 0;"><strong>🪑 Seats:</strong> ${ticketDetails.seats.join(', ')}</p>
          <p style="font-size: 16px; margin: 10px 0;"><strong>⏰ Show Time:</strong> ${ticketDetails.showTime}</p>
          <p style="font-size: 16px; margin: 10px 0;"><strong>💰 Total Amount:</strong> ₹${ticketDetails.amount}</p>
        </div>
        <p style="text-align: center; color: #666;">Enjoy your movie! Please show this email at the counter.</p>
      </div>
    `,
    text: `
🎬 Booking Confirmed!

🎫 Ticket ID: ${ticketDetails.ticketId}
🎥 Movie: ${ticketDetails.movieTitle}
🪑 Seats: ${ticketDetails.seats.join(', ')}
⏰ Show Time: ${ticketDetails.showTime}
💰 Total Amount: ₹${ticketDetails.amount}

Enjoy your movie! Please show this email at the counter.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: email,
      ticketId: ticketDetails.ticketId
    });
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', {
      error: error.message,
      to: email,
      ticketId: ticketDetails.ticketId
    });
    throw error;
  }
};
