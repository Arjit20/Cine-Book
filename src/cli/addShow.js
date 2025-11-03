import mongoose from "mongoose";
     import { connectDB } from "../config/db.js";
     import Show from "../models/show.models.js";

     async function addShow() {
       await connectDB();
       const seats = Array(112).fill().map((_, i) => ({
         seatNumber: `${String.fromCharCode(65 + Math.floor(i / 14))}${(i % 14) + 1}`,
         isBooked: false
       }));
       await Show.create({
         movie: "Spider-Man",
         theater: "Grand Cinema",
         startTime: new Date("2025-09-06T19:00"),
         seats
       });
       console.log("Show added!");
       mongoose.connection.close();
     }

     addShow();