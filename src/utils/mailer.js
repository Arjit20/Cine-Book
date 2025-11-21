import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT) || 465;
const secure = (process.env.EMAIL_SECURE === 'true') || (port === 465);
const user = process.env.EMAIL_USER;
const passRaw = process.env.EMAIL_PASS || '';
const pass = passRaw.replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
	host,
	port,
	secure,
	auth: { user, pass },
});

export async function sendBookingConfirmation(to, booking = {}) {
	const { movieTitle, seats, date, showId, bookingId } = booking;
	const subject = `CineBook — Booking Confirmation${movieTitle ? ' — ' + movieTitle : ''}`;
	const text = `Your booking is confirmed.\n${movieTitle ? `Movie: ${movieTitle}\n` : ''}Show: ${showId || 'N/A'}\nSeats: ${seats || 'N/A'}\nDate: ${date || 'N/A'}\nBooking ID: ${bookingId || 'N/A'}`;

	const mailOptions = {
		from: process.env.MAIL_FROM || user,
		to,
		subject,
		text,
	};

	return transporter.sendMail(mailOptions);
}

export async function sendPaymentConfirmation(to, payment = {}) {
	const {
		bookingId,
		ticketId,
		movieTitle,
		seats,
		totalAmount,
		paymentMethod,
		paymentDate,
		showTime,
		showDate,
		qrCode,
		paymentStatus
	} = payment;

	// Normalize status
	const normalizedStatus = (paymentStatus || 'pending').toLowerCase();

	const subjectPrefix = normalizedStatus === 'paid' ? 'Payment Received' : 'Payment Pending';
	const subject = `CineBook — ${subjectPrefix} — ${movieTitle || 'Your Booking'}`;

	const paymentMethodDisplay = paymentMethod === 'on_arrival' || paymentMethod === 'Payment on Arrival'
		? 'On Arrival (Payment Due at Theater)'
		: 'QR Code Payment';

	const qrHtml = qrCode ? `
		<div class="details">
		  <h2>Your Payment QR Code</h2>
		  <p>Scan this QR code using your payment app to complete the payment:</p>
		  <div style="text-align:center; margin: 12px 0;"><img src="${qrCode}" alt="QR Code" style="max-width:240px; height:auto;"/></div>
		</div>
	  ` : '';

	const htmlContent = `
		<html>
			<head>
				<style>
					body { font-family: 'Arial', sans-serif; color: #333; background-color: #f5f5f5; }
					.container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
					.header { background: linear-gradient(135deg, #e50914 0%, #b20710 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
					.header h1 { margin: 0; }
					.details { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #e50914; border-radius: 4px; }
					.details p { margin: 8px 0; }
					.status-pending { color: #ff9800; font-weight: bold; }
					.status-paid { color: #4caf50; font-weight: bold; }
					.footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
					table { width: 100%; margin: 15px 0; border-collapse: collapse; }
					table td { padding: 8px; border-bottom: 1px solid #ddd; }
					table th { background-color: #f0f0f0; padding: 8px; text-align: left; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>💳 ${normalizedStatus === 'paid' ? 'Payment Confirmed' : 'Payment Pending'}</h1>
						<p>${normalizedStatus === 'paid' ? 'Your payment has been received.' : 'Your payment is pending.'}</p>
					</div>

					<div class="details">
						<h2>Booking Details</h2>
						<p><strong>Movie:</strong> ${movieTitle || 'N/A'}</p>
						<p><strong>Show Date:</strong> ${showDate ? new Date(showDate).toLocaleDateString() : 'N/A'}</p>
						<p><strong>Show Time:</strong> ${showTime || 'N/A'}</p>
						<p><strong>Seats:</strong> ${seats || 'N/A'}</p>
					</div>

					<div class="details">
						<h2>Payment Information</h2>
						<table>
							<tr>
								<th>Ticket ID</th>
								<td>${ticketId || 'N/A'}</td>
							</tr>
							<tr>
								<th>Booking ID</th>
								<td>${bookingId || 'N/A'}</td>
							</tr>
							<tr>
								<th>Total Amount</th>
								<td><strong>₹${totalAmount || '0'}</strong></td>
							</tr>
							<tr>
								<th>Payment Method</th>
								<td>${paymentMethodDisplay}</td>
							</tr>
								<tr>
									<th>Payment Status</th>
									<td>
										${normalizedStatus === 'paid' ? '<span class="status-paid">✓ PAID</span>' : '<span class="status-pending">⚠ PENDING</span>'}
									</td>
								</tr>
							${paymentDate ? `<tr>
								<th>Payment Date</th>
								<td>${new Date(paymentDate).toLocaleString()}</td>
							</tr>` : ''}
						</table>
					</div>

					${qrHtml}

					${paymentMethodDisplay === 'QR Code Payment' ? `
						<div class="details">
							<h2>Instructions for QR Code Payment</h2>
							<p>A QR code for payment is included above. Scan it using your payment app to complete the payment.</p>
						</div>
					` : `
						<div class="details">
							<h2>Important - Payment on Arrival</h2>
							<p><strong>Payment Status: ${normalizedStatus === 'paid' ? 'PAID' : 'PENDING'}</strong></p>
							<p>You have selected to pay at the theater counter when you arrive. Please ensure you complete the payment before the movie starts.</p>
							<p><strong>Please bring this confirmation email or ticket ID (${ticketId}) with you.</strong></p>
						</div>
					`}

					<div class="details">
						<h2>What's Next?</h2>
						<p>✓ Your seats have been reserved</p>
						<p>✓ A confirmation email has been sent</p>
						<p>✓ Your ticket ID is: <strong>${ticketId || 'N/A'}</strong></p>
						<p>Keep this email and your ticket ID safe. You'll need it at the theater.</p>
					</div>

					<div class="footer">
						<p>Thank you for choosing CineBook! Enjoy your movie. 🎬</p>
						<p>This is an automated email. Please do not reply to this message.</p>
					</div>
				</div>
			</body>
		</html>
	`;

	const textContent = `
Payment Confirmation - ${movieTitle}

Booking Details:
Movie: ${movieTitle || 'N/A'}
Show Date: ${showDate ? new Date(showDate).toLocaleDateString() : 'N/A'}
Show Time: ${showTime || 'N/A'}
Seats: ${seats || 'N/A'}

Payment Information:
Ticket ID: ${ticketId || 'N/A'}
Booking ID: ${bookingId || 'N/A'}
Total Amount: ₹${totalAmount || '0'}
Payment Method: ${paymentMethodDisplay}
Payment Status: PAID

${paymentMethod === 'Payment on Arrival' ? `
IMPORTANT - Payment on Arrival:
Your payment status is PENDING. You will pay at the theater counter upon arrival.
Please bring this confirmation or your ticket ID with you.
` : `
Instructions for QR Code Payment:
A QR code for payment will be available in your booking confirmation.
Scan the QR code at the theater counter or via your payment app.
`}

What's Next:
- Your seats have been reserved
- Keep your ticket ID safe: ${ticketId || 'N/A'}
- You'll need it at the theater

Thank you for choosing CineBook!
	`;

	const mailOptions = {
		from: process.env.MAIL_FROM || user,
		to,
		subject,
		text: textContent,
		html: htmlContent
	};

	return transporter.sendMail(mailOptions);
}
