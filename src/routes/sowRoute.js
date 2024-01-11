// route.js
import express from "express";
import authenticateToken from '../middleware/authMiddleware.js';

import sowController from "../controllers/sowController.js";

const sowRouter = express.Router();

// Define your routes

sowRouter.post("/sow", authenticateToken, sowController);

export default sowRouter;
