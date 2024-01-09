// route.js
import express from "express";

import sowController from "../controllers/sowController.js";

const sowRouter = express.Router();

// Define your routes

sowRouter.post("/sow", sowController);

export default sowRouter;
