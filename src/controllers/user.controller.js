import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res, next) => {
    // get user details from frontend
    // validation - not empty, email, password length
    // check if user exists: username, email
    // check for images, check for avatar, cover image
    // upload images to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body
    console.log("email", email)

    //   if(fullName===""){
    //     throw new ApiError(400, "Full Name is required")
    //   }
    if ([fullName, email, username, password].some((value) => value?.trim === "")) {
        throw new ApiError(400, "All feilds are required")
    }
    if(email.includes("@")===false){
        throw new ApiError(400, "Email is invalid")
    }
    User.findOne({ 
        $or: [
            { email: email },
            { username: username }
        ]
     }).then((user) => {
        if (user) {
            throw new ApiError(400, "User already exists")
        }
    })
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(500, "Avatar upload failed, try again")
    }
    const user = User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username: username.toLowerCase()
    })
    const userCreated = await User.findById(user._id).select("-password -refreshToken")

    if(!userCreated){
        throw new ApiError(500, "something went wrong while User creation, try again")
    }
    return res.status(201).json(new ApiResponse(200, userCreated, "User created successfully"))
    
});

export { registerUser };  