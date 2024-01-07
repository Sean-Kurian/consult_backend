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

export async function getFiles(user_id) {
    try {
        const files = (await File.find({ user_id })).map(file => file.fileUrl);
        return { success: true, message: "Retrieved files successfully.", files };
    } catch (error) {
        return { success: false, message: error.message };
    }
}