import File from "../models/fileModel.js";

export async function saveFile(user, fileUrl) {
    try {
        const newFile = new File({ user_id: user, fileUrl });
        await newFile.save();
        return { success: true, message: 'File uploaded successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
