# 🎬 CINE-BOOK - Complete Movie Ticket Booking System

A comprehensive movie ticket booking platform similar to BookMyShow, built with Node.js, Express, MongoDB, and modern web technologies.

## ✨ Features

### 🎫 Core Booking Features
- **Professional Theatre Layout**: Realistic seat arrangement with rows A-H, 10 seats per row
- **Seat Numbering**: Clear seat identification (A1, A2, B1, B2, etc.)
- **VIP Seating**: Premium rows G & H with special pricing
- **Real-time Seat Availability**: Live updates of booked/available seats
- **SMS Ticket Delivery**: Automatic SMS with ticket details and seat numbers
- **Booking History**: Complete user booking management

### 🎭 Admin Panel
- **Movie Management**: Add, edit, delete movies with full details
- **Show Management**: Create and manage show timings
- **Booking Management**: View all bookings and cancel if needed
- **Dashboard**: Real-time statistics and revenue tracking

### 👤 User Features
- **User Authentication**: Secure login/registration
- **Booking History**: View all past and current bookings
- **Ticket Cancellation**: Cancel bookings with automatic seat release
- **Profile Management**: User account management

### 🎨 Modern UI/UX
- **Responsive Design**: Works on all devices
- **Professional Theatre View**: 3D-style seat selection
- **Animated Modals**: Smooth time-slot selection
- **Dark Theme**: Modern cinema-style interface
- **Real-time Updates**: Live seat status updates

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Twilio Account (for SMS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd movie-ticket-booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/movie-booking
   JWT_SECRET=your-super-secret-jwt-key
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-number
   ```

4. **Seed sample data**
   ```bash
   node seedMovies.js
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Main App: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## 📱 SMS Integration

The system automatically sends SMS tickets with:
- Unique Ticket ID
- Movie title and show time
- Seat numbers (A1, A2, etc.)
- Total amount
- Booking confirmation

### Twilio Setup
1. Create a Twilio account
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Add credentials to `.env` file

## 🎯 Usage Guide

### For Users
1. **Register/Login**: Create account or login
2. **Browse Movies**: View available movies and showtimes
3. **Select Seats**: Choose seats using the interactive theatre layout
4. **Enter Phone**: Provide phone number for SMS ticket
5. **Confirm Booking**: Complete booking and receive SMS ticket
6. **View Bookings**: Check booking history in "My Bookings"

### For Admins
1. **Access Admin Panel**: Visit `/admin`
2. **Add Movies**: Create new movie listings
3. **Manage Shows**: Add show timings and pricing
4. **Monitor Bookings**: View all bookings and revenue
5. **Cancel Bookings**: Cancel bookings if needed

## 🏗️ Project Structure

```
movie-ticket-booking/
├── src/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & error handling
│   ├── utils/           # SMS and utility functions
│   └── server.js        # Main server file
├── views/               # EJS templates
├── public/              # Static assets
├── seedMovies.js        # Sample data seeder
└── package.json         # Dependencies
```

## 🛠️ API Endpoints

### Movies
- `GET /api/movies` - Get all movies
- `POST /api/movies` - Create movie
- `PUT /api/movies/:id` - Update movie
- `DELETE /api/movies/:id` - Delete movie

### Shows
- `GET /api/shows` - Get all shows
- `POST /api/shows` - Create show
- `DELETE /api/shows/:id` - Delete show

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /book` - Create booking
- `PUT /api/bookings/:id/cancel` - Cancel booking

## 🎨 Customization

### Seat Layout
- Modify `views/seatSelection.ejs` to change seat arrangement
- Adjust CSS in the same file for styling
- Update JavaScript for seat generation logic

### SMS Template
- Edit `src/utils/sms.js` to customize SMS message
- Add more booking details as needed

### UI Theme
- Modify CSS variables in template files
- Update color schemes and fonts
- Customize animations and transitions

## 🔧 Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check Twilio credentials in `.env`
   - Verify phone number format
   - Check Twilio account balance

2. **Seats not updating**
   - Clear browser cache
   - Check MongoDB connection
   - Verify WebSocket connection

3. **Admin panel not loading**
   - Ensure MongoDB is running
   - Check API routes are properly mounted
   - Verify authentication middleware

## 📈 Future Enhancements

- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Email notifications
- [ ] Movie search and filtering
- [ ] QR code tickets
- [ ] Mobile app
- [ ] Analytics dashboard
- [ ] Multi-theatre support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎬 Demo

Visit the live demo at: [Your Demo URL]

---

**Built with ❤️ for movie lovers everywhere!**




