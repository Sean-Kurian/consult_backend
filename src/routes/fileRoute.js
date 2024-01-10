import express from 'express';
import authenticateToken from '../middleware/authMiddleware.js';
import { getFiles } from '../controllers/fileController.js'

const fileRouter = express.Router();

fileRouter.get('/get', authenticateToken, async (req, res) => {
    const user_id = req.user._id;
    getFiles(user_id).then(result => res.json(result));
});

export default fileRouter;