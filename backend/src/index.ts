import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createServer, get, Server as HTTPServer } from "http";
import Redis from 'ioredis';
import { configDotenv } from 'dotenv';
import nodemailer from 'nodemailer';
import { upload } from "./middleware/multerMiddleware";
import fs from 'fs';
import { loginAdmin, register, loginUser, refreshAccessToken, logoutUser } from "./controllers/userController";
configDotenv({
    path: "./.env"
});

import mongo from "./db/index";
import { getUniversalDateTime, separateDateAndTime } from "./utils/timeStamps";
import path from "path";
import { time } from "console";
// import { ObjectId } from "mongodb";


// Extend the Socket interface to include roomId property
interface CustomSocket extends Socket {
  roomId?: string;
}

type RoomType = {
  roomId: string,
  userName: string,
  agentName: string,
  userEmailId: string,
  agentEmailId:string
}

const rooms = new Map();
let availableAgents:number = 0;

const agentInRoom = (roomId: string) => {
  const room = rooms.get(roomId);
  if(room){
    return room.agentEmailId !== "";
  }
  return false;
}


mongo.init().then(() => {
    console.log('MongoDB connected');
}).catch((error) => {
    console.log('MongoDB connection error:', error);
});



const logStream = fs.createWriteStream(path.join(__dirname, 'logs.txt'), { flags: 'a' });

console.log = function() {
  logStream.write(`${new Date().toISOString()} - ${Array.from(arguments).join(' ')}\n`);
  process.stdout.write(`${new Date().toISOString()} - ${Array.from(arguments).join(' ')}\n`);
};

const PORT = ["https://www.alegralabs.com", "https://alegralabs.com", "http://localhost:5173"]
const FILEURL = process.env.FILE_URL;
console.log("FILEURL: ", FILEURL);

const redis = new Redis()

const app: Application = express();
app.use(
  cors({
    origin: PORT,
    credentials: true
  })
);

const createFolder = (folderName:string) => {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName, { recursive: true });
  }
}

createFolder("public/temp")

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"))
app.get("/", (req, res) => {
  const ipAddress = req.header('x-forwarded-for') || req.socket.remoteAddress || req.ip;

  console.log("IP Address: ", ipAddress)
  return res.status(200).json({ message: "Welcome to Chat-App server" });
});

app.get('/api/logs',async (req, res) => {
  const logFilePath = path.join(__dirname, 'logs.txt');

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return res.status(500).send('Error reading log file');
    }

    const logLines = data.trim().split('\n').map(line => `<pre>${line}</pre>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Logs</title>
        </head>
        <body>
          <h1>Logs</h1>
          ${logLines}
        </body>
      </html>
    `;

    res.send(html);
  });
});

app.post("/api/user/login", loginUser);
app.post("/api/admin/login", loginAdmin);
app.post("/api/admin/register", register);
app.get("/api/logout",logoutUser)
app.post("/api/refresh-token", refreshAccessToken);
app.post("/api/send-transcript", async (req, res) => {
  const { emailId, transcript } = req.body;
  if (emailId === "" || transcript === "") {
    return res.status(400).json({ message: "All fields are required" });
  }


  console.log("Transcript: ", process.env.EMAIL_ID, process.env.EMAIL_PASSWORD)

     // Prepare email content
      const formattedTranscript = transcript.map((message:{sender:string, type:string, message:string, time:string}, index:number) => {
        switch(message.type){
          case "text":  
          return `(${message.time}.) ${message.sender} :  ${message.message}\n`;
          case "notify":
                  if(message.message.includes("joined")){
                    return `(${message.time}.) *** ${message.sender} joined the Chat ***\n`;
                  }else{
                    return `(${message.time}.) *** ${message.sender} left the Chat ***\n`;
                  }
          default:
            return `(${message.time}.) ${message.sender} :  Uploaded a file ${message.message}\n`;
            
        }

      }).join('\n');

      const mailOptions = {
        from: process.env.EMAIL_ID,
        to: emailId,
        subject: 'Chat Transcript',
        text: formattedTranscript,
      };

  // Send email using a secure transport
  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.EMAIL_ID, 
          pass: process.env.EMAIL_PASSWORD, 
      },
  });

  try {
      await transporter.sendMail(mailOptions); 
  } catch (error) {
      console.log('Error sending email: ', error);
     return res.status(500).json({ message: 'Error sending email' });
  }

  return res.status(200).json({ message: "Transcript saved successfully" });
});

app.post('/api/upload', upload.single('file'),async (req, res) => {

  console.log('File uploaded:', req.file)
  try {

    // Get the file URL based on where it's stored
    const fileUrl =`${req.file.filename}`;
    

    console.log("File URL: ", fileUrl)
    // Emit the file URL to other users in the same room
    const {roomId, sender, type, time, email} = req.body; // Assuming roomId is sent from the client
    // const universalDateTime = getUniversalDateTime();
    // await redis.append(roomId, `${JSON.stringify( { roomId, message: FILEURL+fileUrl, type, sender, time })}###`)
    if(roomId === "") return res.status(400).json({ success: false, error: 'Room ID is invalid' }  ); 
    
    if(!agentInRoom(roomId)){
     return res.status(402).json({ success: false, error: 'Upload failed!, Agent not available' });
    }

    io.to(roomId).emit("recieve-message", { roomId, message: FILEURL+fileUrl, type, sender, time, email });
    return res.status(200).json({ success: true, url: fileUrl });
 
  } catch (error) {
    console.log('Error uploading file:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}); 

// Function to get messages from redis
const getMessages = async (roomId:string) => {
  const messages = await redis.get(roomId);
  return messages;
};

// Function to generate a random room name
function generateRandomRoomName(length:number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const server: HTTPServer = createServer(app);
const io: SocketIOServer = new SocketIOServer(server, {
  cors: {
    origin: PORT,
    methods: ["GET", "POST"],
    credentials: true
  }
});


// Queue to hold users waiting to be connected with an agent
let userQueue: string[] = [];

io.use(async(socket:CustomSocket, next) => {
 
  const {token, code} = socket.handshake.auth;

  if(!token || !code){
    return next(new Error("Authentication error"));
  }

  if(code === process.env.SOCKET_AUTH_CODE){
    try{
      const decodedToken:any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
      const {Users} = mongo;
        const user = await Users.findOne({email:decodedToken.email});
        console.log("admin auth", user)
        if (!user) {
          return next(new Error("Authentication error"));
        }

        availableAgents++;
        return next();
    }catch(err){
      return next(new Error("Authentication error"));
    }
    
  }else {
    try{
      const decodedToken:any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log("Decoded Token: ", decodedToken);
      
      
      const getToken = await redis.get(decodedToken?._id);
      console.log("Middleware User Token: ", getToken)
      if(!getToken){
        return  next(new Error("Authentication error"));
      }

      //i want to attach the room id to the socket so that it 
      //can be used to create
      socket.roomId  = "room"+decodedToken?._id;
      // console.log("SOCKET.ROOMID: ", socket.roomId)
      return next();

    }catch(err){
      return next(new Error("Authentication error"));
    }
  }
  // return next(new Error("Authentication error"));
});

io.on("connection", (socket: CustomSocket) => {    
    // Function to update queue status and inform user about their position in the queue
  const updateQueueStatus = () => {
      // Recalculate position in queue for all users
      
      userQueue.forEach((roomId, index) => {

        if(availableAgents === 0){
          io.to(roomId).emit("queue-status", "No agents available at the moment. Please wait for an agent to join the chat");

        }else{
        const positionInQueue = index + 1;
        io.to(roomId).emit("queue-status", `You are at position ${positionInQueue} in the queue. An agent will join you soon.`);
       }
      });
    };

  socket.emit("fetch-users", Array.from(rooms.values()));

  socket.on("connect", () => {
    console.log("User connected", socket.id);

  });

  socket.on("reconnect", () => {
    // socket.emit("fetch-users", Array.from(rooms.values()));
    console.log("User reconnected", socket.id);
    socket.broadcast.emit("fetch-users", Array.from(rooms.values()));

  });


  socket.on("send-file", (data:{roomId:string, file:any, name:string}) => {
    const {roomId, file, name} = data;
    if(agentInRoom(roomId)){
    fs.writeFile(`.public/temp/${file.name}`, file , (err) => {
      if(err){
        console.log("Error: ", err);
      }else{
        console.log("File saved successfully");
        io.to(roomId).emit("recieve-file", {file, name});
      }
    });
  }
  });

  socket.emit("fetch-users", Array.from(rooms.values()));


  //user connect event & adding user to rooms
  socket.on("user-connect", async (userEmailId: string, name: string) => {
    console.log("User connected", name, userEmailId);
    // let existingRoom: { roomId: string; userName: string; userEmailId: string; agentName: string; agentEmailId: string } | undefined;
  
    // Check if the user's email already exists in a room
    // rooms.forEach((room) => {
    //   if (room.userEmailId === userEmailId) {
    //     existingRoom = room;
      
    //   }
    // });
    // console.log("existing room", existingRoom)

    // console.log(rooms)
    console.log("Inside SOCKET.ROOMID: ", socket.roomId)

    const roomId = await redis.get(socket.roomId)
    console.log("Redis ROOMID: ", roomId)
    if (roomId) {
      // Join the existing room 
      // const roomId = existingRoom.roomId;
      console.log("Old User", roomId)
      socket.join(roomId);
      socket.emit("room-id", roomId);
      // socket.broadcast.emit("fetch-users", Array.from(rooms.values()));
      const savedMessages = await getMessages(roomId);
      if(savedMessages) socket.emit("saved-messages", savedMessages, roomId)
    } else {
      // Create a new room
      const roomName = generateRandomRoomName(10);
      console.log("New User", roomName)
      rooms.set(roomName, {
        roomId: roomName,
        userName: name,
        userEmailId,
        agentName: "",
        agentEmailId: "",
      });

      await redis.set(socket.roomId, roomName,  "EX", 2 * 60 * 60)
      socket.join(roomName);
      socket.emit("room-id", roomName);
      console.log("Rooms: ", rooms);
  
      // Add room to the queue
      userQueue.push(roomName);
      // Update queue status for all users
      
      socket.broadcast.emit("notifyAgent");
      // socket.broadcast.emit("fetch-users", Array.from(rooms.values()));
    }

    socket.broadcast.emit("fetch-users", Array.from(rooms.values()));
    updateQueueStatus();
  });




  //sending typing event to connect user/admin 
  socket.on("typing", (data) => {
    socket.broadcast.to(data.room).emit("user-typing", data);
  });

   

  //join room by admin
  socket.on("join-room",async (data:{roomId:string, agentEmailId:string, name:string}) => {
    const {roomId, agentEmailId, name} = data;
    const room = rooms.get(roomId);
    if(room){
      if(room.agentName === "" || room.agentEmailId === ""){
        rooms.set(roomId, {...room, agentName: name, agentEmailId});
        socket.join(roomId);
        const universalDateTime = getUniversalDateTime();
        // const { date, time } = separateDateAndTime(universalDateTime);
        const {Chats} = mongo;
        await Chats.findOneAndUpdate(
          { userEmail: room.userEmailId },
          { $set: { agentEmailId, agentName: name, agentJoinedTime: `${universalDateTime}`} }
        );
        io.to(roomId).emit("agent-joined", {roomId,type:"notify", message:name+" has joined the chat at ", sender:name, time:universalDateTime, email:agentEmailId});
        socket.broadcast.to(roomId).emit("queue-status", "");

         io.emit("fetch-users", Array.from(rooms.values()));
        // Remove room from the queue
        userQueue = userQueue.filter((room) => roomId !== room);
        // Update queue status for all users
        updateQueueStatus();
      }else if( room.agentName === name || room.agentEmailId === agentEmailId ){
        socket.join(roomId);
        const savedMessages = await getMessages(roomId);
        if(savedMessages) socket.emit("saved-messages", savedMessages, roomId)
      }
      else{
        socket.emit("room-full", "User is already taken by another agent");
      }
    }else{
      socket.emit("room-not-found", "User not found");
    }
  });

  

  //Agent leave room
  socket.on("leave-room",async ( data:{roomId:string, type:string, name:string, email:string }) => {
    const {roomId, type, name, email} = data;
    socket.leave(roomId);
    const room = rooms.get(roomId);

    if(room){
        rooms.delete(roomId);
        const chatHistory = await redis.get(roomId); 
        const {Chats} = mongo;
        await Chats.findOneAndUpdate(
          { userEmail: room.userEmailId },
          { $set: { chatHistory } }
        );
        await redis.del(roomId);
      }

    if(type === "User"){
      userQueue = userQueue.filter((room) => roomId !== room);
      updateQueueStatus();

    }

    
    console.log("user left room",JSON.stringify(data))
    io.to(roomId).emit("user-left", {roomId, message: `${name} has left the chat at `, sender:name, type:'notify', time:getUniversalDateTime(), email:email});
    // io.to(roomId).emit("user-left", {roomId, message: `${name} has left the chat at `, sender:name, type:'notify', time:getUniversalDateTime(), email:email}); 
    io.emit("fetch-users", Array.from(rooms.values()));
  });



  //message to room
  socket.on("room-message", async (msg: { roomId: string; message: string, sender:string, type:string, time:string, email:string }) => {
    // console.log("Message: ", msg.roomId, msg.message, msg.sender, msg.type, msg.time, msg.email);
    // console.log("Socket Id: ", socket.id);
    // if(agentInRoom(msg.roomId)){
      console.log("Message: ", msg.roomId, msg.message, msg.sender, msg.type, msg.time, msg.email);
      // const universalDateTime = getUniversalDateTime();
      // const msgData = {...msg, time:universalDateTime};
      // await redis.append(msg.roomId, `${JSON.stringify(msgData)}###`)
      io.to(msg.roomId).emit("recieve-message",msg);
    // }
  });

  //save message to redis
  socket.on("save-message", async (msg: { roomId: string; message: string, sender:string, type:string, time:string, email:string }) => {
    await redis.append(msg.roomId, `${JSON.stringify(msg)}###`);
    await redis.expire(msg.roomId, 60 * 60);
  });

  // socket.on("agent-disconnected",  (data) => {
  //   availableAgents--;
  //   console.log("Agent disconnected: ", data, "Available Agents: ", availableAgents);
    
  // })
  socket.on("agent-connected", (data) => {
    updateQueueStatus();
    console.log("Agent connected: ", data, "Available Agents: ", availableAgents);
  });

  //disconnect event
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    if(socket.handshake.auth.code === process.env.SOCKET_AUTH_CODE){
      availableAgents--;
      updateQueueStatus();
    }
    // const obj= JSON.stringify(socket.handshake.auth)
    console.log("Available Agents: ", availableAgents);

  });


});



server.listen( process.env.PORT, () => {
  console.log("Server is running on port 5005");
});

