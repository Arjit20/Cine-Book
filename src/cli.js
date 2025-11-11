import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from './models/movie.models.js';

dotenv.config();

// Usage: node src/cli.js title genre language duration rating description posterUrl
const args = process.argv.slice(2);

if (args.length < 5) {
  console.log('Usage: node src/cli.js <title> <genre> <language> <duration> <rating> [description] [posterUrl]');
  process.exit(1);
}

const [title, genre, language, duration, rating, description = '', posterUrl = ''] = args;

async function addMovie() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const movie = new Movie({ title, genre, language, duration, rating, description, posterUrl });
    await movie.save();
    console.log('Movie added:', movie);
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

addMovie();
