import {Schema, model} from 'mongoose';

const fileSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    fileUrl: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true,
});

const User = model('User', userSchema);

export default User;