import { connectDB } from './src/config/db.js';
import Movie from './src/models/movie.models.js';
import Show from './src/models/show.models.js';

const sampleMovies = [
  {
    title: "The Dark Knight",
    genre: "Action, Drama",
    language: "English",
    duration: 152,
    rating: 9.0,
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
  },
  {
    title: "Inception",
    genre: "Action, Sci-Fi",
    language: "English",
    duration: 148,
    rating: 8.8,
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"
  },
  {
    title: "Interstellar",
    genre: "Adventure, Drama, Sci-Fi",
    language: "English",
    duration: 169,
    rating: 8.6,
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  }
];

const showTimes = ['10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM', '10:00 PM'];

async function seedMovies() {
  try {
    await connectDB();
    
    // Clear existing movies and shows
    await Movie.deleteMany({});
    await Show.deleteMany({});
    
    console.log('Previous data cleared.');

    // Insert movies
    const movies = await Movie.insertMany(sampleMovies);
    console.log('Movies seeded successfully!');

    // Create shows for each movie
    for (const movie of movies) {
      const movieShows = showTimes.map(time => ({
        movieId: movie._id,
        timing: time,
        bookedSeats: []
      }));
      
      await Show.insertMany(movieShows);
    }
    
    console.log('Shows seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedMovies();