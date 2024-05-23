import { Request, Response } from "express";
import mongo from "../db/index";
import asyncHandler from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError";
import Redis from 'ioredis';
import { getUniversalDateTime, convertToCurrentTimeZone, separateDateAndTime, separateLocalDateAndTime } from "../utils/timeStamps";
import { ObjectId } from "mongodb";

const redis = new Redis();


const generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
  }
  
  const generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
  }
  
  const generateHashedPassword = async (password:string): Promise<string> => {
      return await bcrypt.hash(password,10);
  }
  
  const isPasswordCorrect = async (password:string, dbPassword:string): Promise<boolean> => {
      return await bcrypt.compare(password, dbPassword);
  }
  
  // cookie settings
  const options = {
      httpOnly: true,
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      // secure:true,
      // maxAge: 24 * 60 * 60 * 1000 
  }
  
  const register = asyncHandler( async (req: Request, res: Response) => {
  
          const { name, email, password } = req.body;
          
          if ([name, email, password].some(field => field.trim() === "")) {
              throw new ApiError(400, "All fields are required");
          }
  
          if(!(name.length > 2 && name.length<25) ) throw new ApiError(400,"Username must be between 3-25 characters")
          
          
          // Validate UserName
        //   const USER_REGEX = /^[A-z][A-z0-9-_]{3,23}$/;
        //   if(!USER_REGEX.test(name)) throw new ApiError(400,"Invalid Username")
  
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
              throw new ApiError(400, "Invalid email format");
          }
  
        //   const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%])/;
        //   if( !passRegex.test(password)){
        //       throw new ApiError(400,"Password must contain at least one uppercase letter, one lowercase letter, one number and one special character");
        //   }
          // Validate password length
          if (password.length < 8) {
              throw new ApiError(400,"Password must be at least 8 characters long");
          }
  

  
          const {Users} =  mongo;

          
          const existedUser = await Users.findOne({ $or: [{ name:name}, {email}] });
          if (existedUser) throw new ApiError(409,"User already exists");
  
          const hashPassword = await generateHashedPassword(password);
          const result = await Users.insertOne({ name:name, email, password:hashPassword});
  
          if(!result) throw new ApiError(500,"Something went wrong while registering the user");
  
          res.status(201).json(result);
  
  })
  
  
  const loginAdmin = asyncHandler(async (req:Request, res:Response)=>{
    
    const {email, password} = req.body;

    console.log("loginAdmin", email, password);
    if(!email || !password) throw new ApiError(400,"All fields are required")
  
      // Validate UserName
    //   const USER_REGEX = /^[A-z][A-z0-9-_]{3,23}$/;
    //   if(!USER_REGEX.test(username)) throw new ApiError(400,"Invalid Username")
  
  
    // Validate password length
    if (password.length < 8) {
        throw new ApiError(400,"Password must be at least 8 characters long");
    }
    console.log("before mongo")
    const {Users} =  mongo;
    console.log("after mongo")
    const user = await Users.findOne({email:email})
    console.log("User", user)
    if(!user) throw new ApiError(404,"User doesn't exist")
  
  
    if(!(await isPasswordCorrect(password, user.password))) throw new ApiError(401,"Invalid User Credentials")
   
    const accessToken = await generateAccessToken.call(user);
    const refreshToken =await generateRefreshToken.call(user);
    
  
    // Exclude password field from user object
    const { password: _,_id:id, refreshToken:rfsh, ...userWithoutPassword } = user;
    // Update user information, for example, last login timestamp
    await Users.updateOne(
      { email },
      { $set: { refreshToken } }
    );
    
    res.status(200).cookie("refreshToken", refreshToken, options).json({ ...userWithoutPassword, accessToken });
  
  });
  
  
  const logoutUser = asyncHandler(async(req, res) => {
    
    const cookies = req.cookies;
  
      if (!cookies?.refreshToken) {
        return res.status(204).json("User already logged out");
        }
  
    const refreshToken = req.cookies.refreshToken;
  
    const { Users } = mongo;
  
    const foundUser = await Users.findOneAndUpdate(
      { refreshToken},
      { $set: { refreshToken: '' } }
      );
  
    if (!foundUser) {
      return res.status(200)
      .clearCookie("refreshToken", options)
      .json({message:"User logged Out"});
    }
  
    // await collection.updateOne(
    //   { refreshToken:"" },
    //   { $set: { refreshToken: '' } }
    // );
  
  
    console.log("logout validation completed")
    return  res.status(200).clearCookie("refreshToken", options).json({message:"Agent logged Out"})
  })

  const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, username } = req.body;
    console.log("loginUser", email, username);
    // Check if email and username are provided
    if (!email || !username) {
      throw new ApiError(400, "Email and username are required");
    }
  
    // Validate username length
    if (username.length < 3 || username.length > 25) {
      throw new ApiError(400, "Username must be between 3-25 characters");
    }
  
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }
  
    const { Chats } = mongo;
    const universalDateTime = getUniversalDateTime();
    const { date, time } = separateDateAndTime(universalDateTime);
    const chat =  await Chats.insertOne({
      userEmail: email,
      username,
      agentEmailId: "",
      agentName: "",
      ip: req.ip,
      chatHistory: `(${date} , ${time}.) ${username} :  ${username} joined the chat\n`,
      userJoinedTime: `${date} , ${time}`,
      agentJoinedTime: "",
    });

    if (!chat) {
      throw new ApiError(500, "Something went wrong while logging in");
    }

    console.log("Chat", chat);


    
    const key = chat?.insertedId.toString();
    console.log("USER login-key", key)
    const token = generateAccessToken.call({ _id: key, email, username });
    const refreshToken =await generateRefreshToken.call({ _id: key});
    const value = `${email}###${username}`;
    await redis.set(key, value, "EX", 60 * 60);
    console.log("USER: refreshTOken", refreshToken)
    return res.status(200).cookie("refreshToken", refreshToken, options).json({ email, username, message: "User Logged in successfully", accessToken:token });
  });


  const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    const { type } = req.body;
    // console.log("refresh token", incomingRefreshToken)
    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken:any = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
          
      if(type === "admin"){
        const {Users} = mongo;
        // for admin
        const user = await Users.findOne({_id: new ObjectId(decodedToken?._id)})
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used")
            
        }
    
    
        const accessToken = await generateAccessToken.call(user);
        const { password: _,_id:id, refreshToken:rfsh, email:emailId, ...userWithoutPassword } = user;
        return res
        .status(200)
        .cookie("refreshToken", incomingRefreshToken, options)
        .json({emailId,...userWithoutPassword,  accessToken});
      }else{

        const key = decodedToken?._id;
        // console.log("key", key)
        const token = await redis.get(key);
        // console.log("token", token)
        if (!token) {
            throw new ApiError(401,"Invalid refresh token")
        }

        const [email, username] = token.split("###");
        const accessToken = generateAccessToken.call({ _id: key, email, username });
        return res.status(200).cookie("refreshToken", incomingRefreshToken, options).json({ emailId:email, username, message: "User Logged in successfully", accessToken });

      }


    } catch (error) {
        throw new ApiError(401,  "Invalid refresh token")
    }

})


  export { register, loginAdmin, logoutUser, loginUser , refreshAccessToken }