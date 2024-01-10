import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../models/s3Model.js';

const generatePresignedUrl = async (bucketName, objectKey) => {
    const objectParams = {
        Bucket: bucketName,
        Key: objectKey
    };
    const command = new GetObjectCommand(objectParams);
  
    try {
      const url = await getSignedUrl(s3, command, { expiresIn: 60*60*24*3 });
      return url;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  };
  
  export default generatePresignedUrl;
