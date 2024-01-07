// route.js
import express from "express";
import testController from "../controllers/controller.js";
import sowController from "../controllers/sowController.js";

const testRouter = express.Router();

// Define your routes


testRouter.get("/sow", sowController);

export default testRouter;
