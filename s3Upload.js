import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import { config } from 'dotenv';
config();

const BUCKET_NAME = process.env.BUCKET_NAME;
const REGION = process.env.REGION;
const ACCESS_KEY = process.env.ACCESS_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

//s3client
const s3 = new AWS.S3({
    credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY
    },
    region: REGION
});

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

const uploadToAws = (req, res) => {
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

const router = express.Router();

router.post('/upload', uploadToAws);

export { router as s3Router };