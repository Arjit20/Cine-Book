#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Show from '../src/models/show.models.js';
import Movie from '../src/models/movie.models.js';

const MONGO = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook';

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const shows = await Show.find();
  let updated = 0;
  for (const s of shows) {
    if ((!s.movieTitle || s.movieTitle === 'Unknown Movie') && s.movieId) {
      const m = await Movie.findById(s.movieId);
      if (m) {
        s.movieTitle = m.title;
        await s.save();
        updated++;
        console.log(`Updated show ${s._id} -> ${m.title}`);
      }
    }
  }

  console.log(`Done. Updated ${updated} shows.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
