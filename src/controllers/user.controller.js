import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
//steps
//get user details from frontend
//validation of user details--not empty
//check user alreeady exits--using email,username
//check for images ,check for avatar
//upload to cloudnary,avatar 
//create user object--create entry in Db
//remove the password and refresh token field from response 
//check for user creation
//return response
const registerUser=asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}=req.body
    console.log("email",email)
    
    // if (fullname===""){
    //     throw new ApiError(400,"fullname is required")
    // }
    //better way
    if ([fullname,email,username,password].some((field)=>
        field?.trim()===""))
        {
            throw new ApiError(400,"all fields are required")
        }

    const existedUser=User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username allready exists")
    }
    //check for files
    const avatarLocalPath=req.files?.avatar[0]?.path;
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



export {registerUser}