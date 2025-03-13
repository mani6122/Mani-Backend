import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res, next) => {
  // code goes here
  res.status(200).json({
    success: true,
    message: "User registered successfully done",
  });
});

export {registerUser};  