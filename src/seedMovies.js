import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from './models/movie.models.js';

dotenv.config();

const movies = [
  {
    title: 'Inception',
    genre: 'Sci-Fi',
    language: 'English',
    duration: 148,
    rating: 8.8,
    description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
    posterUrl: 'https://m.media-amazon.com/images/I/51oDg+e1XlL._AC_SY679_.jpg',
  },
  {
    title: 'Interstellar',
    genre: 'Adventure',
    language: 'English',
    duration: 169,
    rating: 8.6,
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
    posterUrl: 'https://m.media-amazon.com/images/I/71n58vFQZlL._AC_SY679_.jpg',
  },
  {
    title: '3 Idiots',
    genre: 'Comedy',
    language: 'Hindi',
    duration: 170,
    rating: 8.4,
    description: 'Three idiots, friends at an engineering college, learn life lessons while challenging the system.',
    posterUrl: 'https://m.media-amazon.com/images/I/81p+xe8cbnL._AC_SY679_.jpg',
  },
    {
    title: "Avatar",
    genre: "Fantasy",
    language: "English",
    duration: 162,
    rating: 7.8,
    posterUrl: "https://example.com/avatar.jpg"
  }
];

async function seedMovies() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Movie.deleteMany();
    await Movie.insertMany(movies);
    console.log('Sample movies inserted!');
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

seedMovies();
