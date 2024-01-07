// server.js
import { config } from "dotenv";
config();

import testRouter from "./src/routes/route.js";
import cors from "cors";
import express from "express";
import mongoose from 'mongoose';
import s3Router from './src/routes/s3Route.js';
import authRouter from './src/routes/authRoute.js';

const app = express();
const port = 5000;

app.use(
  cors({
    origin: "http://localhost:3000", // replace with the URL of your React app
  })
);

app.use(express.json());

const uri = process.env.DB_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
});

app.use(testRouter);
app.use("/pdf", s3Router);
app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
