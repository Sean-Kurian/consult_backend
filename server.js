// server.js
import { config } from "dotenv";
config();

import sowRouter from "./src/routes/sowRoute.js";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import s3Router from "./src/routes/s3Route.js";
import authRouter from "./src/routes/authRoute.js";
import fileRouter from "./src/routes/fileRoute.js";

const app = express();
const port = 5000;

app.use(
  cors({
    origin: ["http://3.130.6.61:3000", "http://localhost:3000"], // replace with the URLs of your React apps
  })
);

app.use(express.json());

const uri = process.env.DB_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

app.use(sowRouter);
app.use("/s3", s3Router);
app.use("/auth", authRouter);
app.use("/file", fileRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
