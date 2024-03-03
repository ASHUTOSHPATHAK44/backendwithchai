import mongoose,{Schema} from "mongoose";

import jwt from "jsonwentoken"
import bcrypt from "bcrypt"

const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true,//for searching
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },        
        avtar:{
            type:String,  //cloudinary url and its free
            required:true,
        },
        coverImage:{
            type:String,//cloudinary
        },
        watchHistory:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Vedio"
        }
        ],
        password:{
            type:String,
            req:[true,"password is required"]

        },
        refreshToken:{
            type:String
        }

    },{timestamps:true})

//password ko incrypt tabhi kare jab change hua ho ya phile bar banaya ho
userSchema.pre("save",async function (next) {
    if (!this.isModified("password")) return next();  //har bar password na update ho
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

//refresh token contain less data as it refresh more frequently
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)