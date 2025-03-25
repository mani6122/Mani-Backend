import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshToken = async (userid) => {
    try {
        const user = await User.findById(userid)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens, Token generation failed")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty, email, password length
    // check if user exists: username, email
    // check for images, check for avatar, cover image
    // upload images to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation
    // return res

    const { fullname, email, username, password } = req.body
    // console.log("email", email)



    //   if(fullName===""){
    //     throw new ApiError(400, "Full Name is required")
    //   }
    if ([fullname, email, username, password].some((value) => value?.trim === "")) {
        throw new ApiError(400, "All feilds are required")
    }
    // if(email.includes("@")===false){
    //     throw new ApiError(400, "Email is invalid")
    // }



    const existeduser = await User.findOne({
        $or: [
            { email: email },
            { username: username }
        ]
    })
    if (existeduser) {
        throw new ApiError(400, "User already exists")
    }
    // console.log("requested files : ", req.files)



    const avatarLocalPath = req.files?.avatar && Array.isArray(req.files.avatar) && req.files.avatar.length > 0 ? req.files.avatar[0].path : undefined;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }



    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(500, "Avatar upload failed, try again")
    }
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const userCreated = await User.findById(user._id).select("-password -refreshToken")


    if (!userCreated) {
        throw new ApiError(500, "something went wrong while User creation, try again")
    }
    return res.status(201).json(new ApiResponse(200, userCreated, "User created successfully"))

});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // email/username, password
    // check if user exists
    // check password
    // generate access token and refresh tokenv 
    // return res

    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email required")
    }

    const userExist = await User.findOne({ $or: [{ username }, { email }] })

    if (!userExist) {
        throw new ApiError(400, "User does not exist")
    }

    const isPasswordValid = await userExist.isPasswordCorrect(password)

    if (!isPasswordValid) {
        console.log("Password validation failed:", isPasswordValid);
        throw new ApiError(401, "credentials are invalid")
    }


    const { accessToken, refreshToken } = await generateAccessandRefreshToken(userExist._id)

    const loggedInUser = await User.findById(userExist._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, "User logged in successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { new: true }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
    
        const options = {
            httpOnly: true,
            secure: true,
        }
        const {accessToken,newRefreshToken} = await generateAccessandRefreshToken(user._id)
    
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, {
                accessToken,
                refreshToken: newRefreshToken
            }, "Tokens refreshed successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized request")
        
    }

})
export { registerUser, loginUser, logoutUser,refreshAccessToken };  