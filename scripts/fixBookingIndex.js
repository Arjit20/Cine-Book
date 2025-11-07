import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/movie-booking';
  await mongoose.connect(mongoUri);
  const col = mongoose.connection.collection('bookings');
  try {
    const idx = await col.indexExists('bookingId_1');
    if (idx) {
      await col.dropIndex('bookingId_1');
      console.log('Dropped index bookingId_1');
    }
  } catch (e) {
    console.log('Drop index skipped:', e.message);
  }

  await col.updateMany({}, { $unset: { bookingId: '' } });
  console.log('Removed bookingId field from existing documents');

  try {
    await col.createIndex({ ticketId: 1 }, { unique: true });
    console.log('Ensured unique index on ticketId');
  } catch (e) {
    console.log('Create index skipped:', e.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});






