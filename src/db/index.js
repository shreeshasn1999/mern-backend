import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(connectionInstance);
    console.log(
      `\n MONGO DB CONNECTED! DB HOST ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log('MONGO DB CONNECTION FAILED', error);
    process.exit(1); // read about this
  }
}

export default connectDB;
