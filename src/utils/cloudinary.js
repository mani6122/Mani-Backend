import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localfilePath) => {
    try {
        if (!localfilePath) throw new Error("File path is required")
        const result = await cloudinary.uploader.upload(localfilePath,{
            resource_type: "auto",
            public_id: "sample_image",
        })
        console.log("file has been uploaded successfully", result.url)
        return result 
    } catch (error) {
        fs.unlinkSync(localfilePath) // just removes the locally saved temprary file as the file is uploaded is failed
        
    }
}

export {uploadOnCloudinary}

// cloudinary.v2.uploader.upload("https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg'", { public_id: "shoes" },
//     function (error, result) {
//         console.log(result, error)
//     })