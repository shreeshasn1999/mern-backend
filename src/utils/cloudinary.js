import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadOnCloudinary(filePath) {
  try {
    if (!filePath) return null;
    // upload on cloudinary
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
    });
    console.log('File is uploaded on Cloudinary!', response);
    fs.unlinkSync(filePath);
    return response;
  } catch (error) {
    fs.unlinkSync(filePath); //* remove the locally saved temp file as the upload operation failed
    return null;
  }
}

export { uploadOnCloudinary };
