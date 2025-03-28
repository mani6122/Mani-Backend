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

    if (!incomingRefreshToken) {
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
        const { accessToken, newRefreshToken } = await generateAccessandRefreshToken(user._id)

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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body

    if (!(newPassword === confPassword)) {
        throw new ApiError(400, "New password and confirm password does not match")
    }

    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new ApiResponse(200, undefined, "Password changed successfully"))
}

)

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User details fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email, password } = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "Fullname and email are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id
        , {
            $set: {
                fullname,
                email: email.toLowerCase()
            }
        }
        , {
            new: true,  // returns the new information after saving
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User details updated successfully"))
})

const upadteAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, "Avatar upload failed, try again")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }, {
        new: true
    }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(500, "Avatar upload failed, try again")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {
        new: true
    }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Cover Image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel", // channel id
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber", // subscriber id
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                },
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1,
            }
        }

    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel details fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },   // ,{},{}
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0],
                            },
                        }
                    }
                ]
            }
        },

    ])
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0]?.watchHistory,
            "Watch history fetched successfully"
        ))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    upadteAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};  
