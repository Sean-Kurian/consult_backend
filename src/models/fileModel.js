import {Schema, model} from 'mongoose';

const fileSchema = new Schema({
    user_id: {
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

const File = model('File', fileSchema);

export default File;