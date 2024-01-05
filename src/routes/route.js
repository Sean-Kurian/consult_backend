// route.js
import express from 'express';
import testController from '../controllers/controller.js';

const testRouter = express.Router();

// Define your routes
testRouter.get('/number', testController);

export default testRouter;
