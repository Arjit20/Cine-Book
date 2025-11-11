
// MONGO_URI=mongodb://localhost:27017/movie-booking

// # JWT Secret
// JWT_SECRET=your-super-secret-jwt-key-here

// # # Twilio Configuration (Trial Account)
// # TWILIO_ACCOUNT_SID=AC********** # From Twilio Console
// # TWILIO_AUTH_TOKEN=************  # From Twilio Console
// # TWILIO_PHONE_NUMBER=+1********* # Your free trial number

// # # Twilio SMS Configuration (for ticket delivery)
// # TWILIO_MESSAGING_SERVICE_SID=your-messaging-service-sid

// # Email Configuration (Gmail)
// EMAIL_USER=apoorvaverma985@gmail.com
// EMAIL_PASS=crdz mtec ocvx dtul

// # Server Configuration
// PORT=3000
// NODE_ENV=development

socket.on('bookingConfirmed', (details) => {
  const message = `
✅ Seats ${details.seats.join(', ')} booked successfully!
🎫 Ticket ID: ${details.ticketId}
💰 Total: ₹${details.amount}
${details.emailStatus}`;
  
  alert(message);
  window.location.href = '/my-bookings';
});