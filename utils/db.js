import mongoose from "mongoose";

let cachedDb = null;

const uri = process.env.MONGO_URI;
const dbName = process.env.DATABASE_NAME;

export const connectToDatabase = async () => {
  if (cachedDb) {
    console.log("Using existing MongoDB connection");
    return cachedDb;
  }

  try {
    await mongoose.connect(uri, {
      dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    cachedDb = mongoose.connection;
    return cachedDb;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
};

export const closeDatabaseConnection = () => {
  if (cachedDb) {
    mongoose.connection.close();
    console.log("Closed MongoDB connection");
    cachedDb = null;
  }
};
