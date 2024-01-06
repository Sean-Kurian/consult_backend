import express from 'express';
import { uploadToAws } from '../controllers/s3Controller.js'

const s3Router = express.Router();

s3Router.post('/upload', uploadToAws);

export default s3Router;