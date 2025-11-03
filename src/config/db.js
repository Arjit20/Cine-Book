import mongoose from "mongoose";

   export const connectDB = async () => {
     try {
       await mongoose.connect("mongodb://127.0.0.1:27017/movie-booking", {
         useNewUrlParser: true,
         useUnifiedTopology: true
       });
       console.log("MongoDB connected!");
     } catch (err) {
       console.error("DB Error:", err); // Topic 15
       throw err; // Topic 16
     }
   };