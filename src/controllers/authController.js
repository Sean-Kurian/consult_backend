import User from "../models/userModel.js";

export async function signUp(username, email, password) {
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            throw new Error('Username or email already exists');
        }
        const newUser = new User({ username, email, password });
        await newUser.save();
        return { success: true, message: 'User registered successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export async function login(email, password) {
    try {
        const user = await User.findByCredentials(email, password);

        if (!user) {
            throw new Error('Invalid email or password');
        }
        const username = user.username;
        const token = await user.generateAuthToken();
        
        return { success: true, token, username, message: 'Login successful' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export function logout(user_id, token) {
    try {
        User.findOneAndUpdate(
            { _id: user_id },
            { $pull: { tokens: {token}}},
            { new: true }
        ).then( _ => {
            console.log("Removed token successfully.");
        });
    } catch (error) {
        console.log(error.message);
    }
}