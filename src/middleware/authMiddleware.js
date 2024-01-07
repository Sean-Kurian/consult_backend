import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    jwt.verify(token.replace('Bearer ', ''), process.env.TOKEN_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        }

        req.user = user;
        next();
    });
};

export default authenticateToken;