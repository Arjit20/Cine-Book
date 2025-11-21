import express from 'express';
import Booking from '../models/booking.models.js';
import { sendPaymentConfirmation } from '../utils/mailer.js';
import { authenticate, requireAuth } from '../middleware/auth.js';
import QRCode from 'qrcode';

const router = express.Router();

/* ------------------------------------------------------
   POST /payment/select-method
   Sets payment method + generates QR + sends pending email
--------------------------------------------------------- */
router.post('/select-method', authenticate, requireAuth, async (req, res) => {
    try {
        const { bookingId, paymentMethod } = req.body;

        if (!bookingId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID and payment method are required'
            });
        }

        if (!['on_arrival', 'qr_payment'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        const booking = await Booking.findById(bookingId).populate({
            path: 'showId',
            populate: { path: 'movieId' }
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Set method + keep pending
        booking.paymentMethod = paymentMethod;
        booking.paymentStatus = 'pending';

        // QR Payment → generate QR code
        let qrDataUrl = null;
        if (paymentMethod === 'qr_payment') {
            const qrData = {
                bookingId: booking._id.toString(),
                ticketId: booking.ticketId,
                amount: booking.totalAmount,
                timestamp: Date.now()
            };

            try {
                qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
                booking.qrCode = qrDataUrl;
            } catch (qrErr) {
                console.error('QR generation error:', qrErr);
            }
        }

        await booking.save();

        // Send email – pending payment
        try {
            await sendPaymentConfirmation(booking.email, {
                bookingId: booking._id,
                ticketId: booking.ticketId,
                movieTitle: booking.showId?.movieId?.title || 'Movie',
                seats: (booking.seats || []).join(', '),
                totalAmount: booking.totalAmount,
                paymentMethod:
                    paymentMethod === 'on_arrival'
                        ? 'Payment on Arrival'
                        : 'QR Code Payment',
                paymentStatus: 'pending',
                qrCode: qrDataUrl,
                showTime: booking.showTime,
                showDate: booking.showDate
            });
        } catch (mailErr) {
            console.error('Failed to send payment-pending email:', mailErr);
        }

        return res.json({
            success: true,
            message: `Payment method set to ${
                paymentMethod === 'on_arrival' ? 'On Arrival' : 'QR Payment'
            }`,
            booking: {
                _id: booking._id,
                ticketId: booking.ticketId,
                totalAmount: booking.totalAmount,
                paymentMethod: booking.paymentMethod,
                paymentStatus: booking.paymentStatus,
                qrCode: booking.qrCode || null
            }
        });
    } catch (err) {
        console.error('select-method error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to set payment method',
            error: err.message
        });
    }
});

/* ------------------------------------------------------
   POST /payment/confirm
   Marks booking as paid + sends paid email
--------------------------------------------------------- */
router.post('/confirm', authenticate, requireAuth, async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required'
            });
        }

        const booking = await Booking.findById(bookingId).populate({
            path: 'showId',
            populate: { path: 'movieId' }
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (!booking.paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Payment method not selected'
            });
        }

        booking.paymentStatus = 'paid';
        booking.paymentDate = new Date();
        await booking.save();

        // Send PAID email
        try {
            await sendPaymentConfirmation(booking.email, {
                bookingId: booking._id,
                ticketId: booking.ticketId,
                movieTitle: booking.showId?.movieId?.title || 'Movie',
                seats: (booking.seats || []).join(', '),
                totalAmount: booking.totalAmount,
                paymentMethod:
                    booking.paymentMethod === 'on_arrival'
                        ? 'Payment on Arrival'
                        : 'QR Code Payment',
                paymentStatus: 'paid',
                paymentDate: booking.paymentDate,
                showTime: booking.showTime,
                showDate: booking.showDate
            });
        } catch (mailErr) {
            console.error('Failed to send payment-paid email:', mailErr);
        }

        return res.json({
            success: true,
            message: 'Payment confirmed successfully',
            booking: {
                _id: booking._id,
                ticketId: booking.ticketId,
                totalAmount: booking.totalAmount,
                paymentStatus: booking.paymentStatus,
                paymentDate: booking.paymentDate
            }
        });
    } catch (err) {
        console.error('confirm error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to confirm payment',
            error: err.message
        });
    }
});

/* ------------------------------------------------------
   GET /payment/status/:bookingId
--------------------------------------------------------- */
router.get('/status/:bookingId', authenticate, requireAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        return res.json({
            success: true,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
            totalAmount: booking.totalAmount,
            ticketId: booking.ticketId,
            qrCode: booking.qrCode || null
        });
    } catch (err) {
        console.error('status error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: err.message
        });
    }
});

export default router;
