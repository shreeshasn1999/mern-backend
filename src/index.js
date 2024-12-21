// require('dotenv').config({ path: './env' });
import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({
  path: '/.env',
});

connectDB();

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
