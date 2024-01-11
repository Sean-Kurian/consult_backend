import express from 'express';
import multer from 'multer';
import authenticateToken from "../middleware/authMiddleware.js";
import {signUp, login, logout} from '../controllers/authController.js';

const authRouter = express.Router();

const upload = multer();

authRouter.post('/register', upload.none(), async (req, res) => {
    const { username, email, password } = req.body;
    const result = await signUp(username, email, password);
    res.json(result);
});

authRouter.post('/login', upload.none(), async (req, res) => {
    const { email, password } = req.body;
    const result = await login(email, password);
    if (result.success) {
        // Send the token in the response header
        res.header('Authorization', `Bearer ${result.token}`);
        res.header('Access-Control-Expose-Headers', 'Authorization');
        res.json({ success: true, message: 'Login successful', username: result.username });
    } else {
        res.json({ success: false, message: result.message });
    }
});

authRouter.post('/logout', authenticateToken, (req, res) => {
    const token = req.header('Authorization');
    logout(req.user._id, token.replace('Bearer ', ''));
    res.json({message: "Logout request sent"});
});

export default authRouter;