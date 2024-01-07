import express from 'express';
import authenticateToken from '../middleware/authMiddleware.js';
import { uploadToAws } from '../controllers/s3Controller.js'

const s3Router = express.Router();

s3Router.post('/upload', authenticateToken, uploadToAws);

export default s3Router;