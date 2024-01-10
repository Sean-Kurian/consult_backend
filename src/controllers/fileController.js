import File from "../models/fileModel.js";
import generatePresignedUrl from "../utils/generatePresignedUrl.js";
import { config } from "dotenv";
config();

export async function saveFile(user_id, key) {
    try {
        const newFile = new File({ user_id, key });
        await newFile.save();
        return { success: true, message: 'File uploaded successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export async function getFiles(user_id) {
    try {
        const files = await Promise.all((await File.find({ user_id })).map(async file => 
            await generatePresignedUrl(process.env.BUCKET_NAME, file.key)
        ));
        return { success: true, message: "Retrieved files successfully.", files };
    } catch (error) {
        return { success: false, message: error.message };
    }
}