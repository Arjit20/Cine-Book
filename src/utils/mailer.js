const nodemailer = require('nodemailer');

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

async function sendBookingConfirmation(to, booking = {}) {
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

module.exports = { sendBookingConfirmation };
