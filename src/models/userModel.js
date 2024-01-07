import {Schema, model} from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
config();

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "Your username is required"],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, "Your email address is required"],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (value) {
                return /\S+@\S+\.\S+/.test(value);
            },
            message: 'Invalid email address',
        },
    },
    password: {
        type: String,
        required: [true, "Your password is required"]
    },
    tokens: [{
        token: {
            type: String,
            required: true,
        },
    }],
}, {
    timestamps: true,
});

userSchema.pre("save", async function(next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 12);
    }

    next()
});

// Generate a JWT token for the user
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.TOKEN_KEY, { expiresIn: '7 days' });
    user.tokens = user.tokens.concat({ token });
    await user.save();
    return token;
};

// Static method to find a user by email and password
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }

    return user;
};

const User = model('User', userSchema);

export default User;