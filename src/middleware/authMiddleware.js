import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { config } from 'dotenv';
config();

const authenticateToken = async (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    jwt.verify(token.replace('Bearer ', ''), process.env.TOKEN_KEY, async (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        }

        const userObj = await User.findOne({ _id: user._id });
        if (!userObj) { // makes sure token represents a valid user id
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        }

        if (!userObj.tokens || !userObj.tokens.some(tokenObj => tokenObj.token === token.replace('Bearer ', ''))) { // makes sure that token is in the user
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        }

        req.user = user;
        next();
    });
};

export default authenticateToken;