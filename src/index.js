// require('dotenv').config({ path: './env' });
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
  path: '/.env',
});

connectDB()
  .then(() => {
    app.on('error', (error) => {
      console.log(error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running at Port no. ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(` Mongo DB Connection Failed!, error: ${error}`);
  });

// one way of doing it
// function connectDB() {}

// connectDB();

// IIFE can be used for the same

// const app = express();
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on('error', (error) => {
//       console.log(error);
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`App is listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// })();
