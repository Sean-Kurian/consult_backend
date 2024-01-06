// route.js
import express from "express";
import testController from "../controllers/controller.js";
import sowController from "../controllers/sow.js";

const testRouter = express.Router();

// Define your routes
testRouter.get("/number", testController);

testRouter.get("/sow", sowController);

export default testRouter;
