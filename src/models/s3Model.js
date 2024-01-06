import { S3 } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
config();

const REGION = process.env.REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;

//s3client
const s3 = new S3({
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY
    },

    region: REGION
});

export default s3;