import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import  Jwt  from "jsonwebtoken";
//steps
//get user details from frontend
//validation of user details--not empty
//check user alreeady exits--using email,username
//check for images ,check for avatar
//upload to cloudnary,avatar 
//create user object--create entry in Db
//remove the password and refresh token field from response 
//check for user creation
//return response]

//this is a method to generate access and refresh token
// const generateAccessAndRefreshToken=async(userId)=>{
//     try{
//         const user=await User.findById(userId)
//         const accessToken= user.generateAccessToken()
//         const refreshToken=user.generateRefreshTOken() 
//         user.refreshToken=refreshToken
//         await user.save({validateBeforeSave:false})
//         return {accessToken,refreshToken}
//     } catch(error){
//         throw new ApiError(500,"something went wrong while generating access token")
//     }
// }
//bygithub
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}=req.body
    //console.log("email",email)
    
    // if (fullname===""){
    //     throw new ApiError(400,"fullname is required")
    // }
    //better way
    if ([fullname,email,username,password].some((field)=>
        field?.trim()===""))
        {
            throw new ApiError(400,"all fields are required")
        }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username allready exists")
    }
    //check for files
    const avatarLocalPath=req.files?.avtar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar =await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create(
        {
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase(),
        })
    //check if user created
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while regestering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registerd successfully")
    )



})


//req body se data lao
//usrname ya email hai ya nahi
//find the user
//password check
//access and refresh token
//send cookie
// const loginUser=asyncHandler(async (req,res)=>{

//     const {username,email,password}=req.body
//     if(!username && !email){
//         throw new ApiError(400,"username or password is required")
//     }

//     const user =await User.findOne({$or:[{username},{email}]})

//     if(!user){
//         throw new ApiError(400,"user does not exits")
//     }

//     const isPasswordValid=await user.isPasswordCorrect(password)

//     if(!isPasswordValid){
//         throw new ApiError(401,"invalid user credentials")
//     }

//     const {accessToken,refreshToken}=await generateAccessAndRefreshTOken(user._id)

//     const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

//     const option={
//         httpOnly:true,
//         secure:true
//     }

//     return res.status(200)
//     .cookie("accessToken",accessToken,option)
//     .cookie("refreshToken",refreshToken,option)
//     .json(
//         new ApiResponse(
//             200,
//             {
//                 user:loggedInUser,accessToken,refreshToken
//             },
//             "user logged in successfully"
//         )
//     )

// })

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})



const logoutUser =asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"user logged out"))
    
})

//to send refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = Jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})





export {registerUser,loginUser,logoutUser,refreshAccessToken}