// server.js
import testRouter from './src/routes/route.js';
import cors from 'cors';
import express from 'express';

const app = express();
const port = 5000;

const s3Router = require('./s3Upload.js');

app.use(
  cors({
    origin: "http://localhost:3000", // replace with the URL of your React app
  })
);

app.use(express.json());

app.use(testRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/upload_pdf", s3Router);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
