import express from 'express';
import multer from 'multer';
import {signUp, login} from '../controllers/authController.js'

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
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.json({ success: false, message: result.message });
    }
});

export default authRouter;