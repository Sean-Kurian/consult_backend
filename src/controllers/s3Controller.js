import s3 from '../models/s3Model.js'
import multer from 'multer';
import multerS3 from 'multer-s3';
import { config } from 'dotenv';
config();

const BUCKET_NAME = process.env.BUCKET_NAME;

const uploadWithMulter = () => multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        metadata: function(req, file, cb) {
            cb(null, {fieldname: file.fieldname})
        },
        key: function(req, file, cb) {
            cb(null, file.originalname)
        }
    })
}).array("s3Pdf", 4)

export const uploadToAws = (req, res) => {
    const upload = uploadWithMulter();

    upload(req, res, err => {
        if (err) {
            console.log(err);
            res.json({err, msg: 'Error occurred while uploading'})
        } else {
            res.json({msg: 'Files uploaded successfully', files: req.files})
        }
    })
}