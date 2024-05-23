import ChatArea from "./ChatArea";
import { useEffect, useMemo, useRef, useState} from "react";
import { io } from 'socket.io-client';
// import messageSound from "../assets/sound/message.mp3";
import notifySound from "../assets/sound/notify2.wav";
// import ringSound from "../assets/sound/ring.mp3";
import { messageTypes } from "../types";
import axios from 'axios';
import { useAdmin } from "../context/AuthContext";
import { port, enter_key_send } from "../config";
// import useRefreshToken from "../hooks/useRefreshToken";

interface Room {
  roomId: string;
  userName: string;
  userEmailId: string;
  agentId: string;
  agentEmailId: string;
}



type UserMessages = {
  [userID: string]: messageTypes[];
}

type UsernameType = {
  [roomID: string]: string;
}


// Function to get the universal date and time
function getUniversalDateTime(): string {
  const date = new Date();
  const universalDateTime: string = date.toISOString();
  return universalDateTime;
}

function convertToCurrentTimeZone(universalDateTime: string): string {
    const date = new Date(universalDateTime);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle 0 as 12 PM

    const localTime = `${hours}:${minutes} ${ampm}`;
    return localTime;
}



 // Function to get current timestamp in IST with separated date and time
 const getISTTimestamp = ():{date:string, time:string} => {
  const now = new Date();
  const ISTOffset = 330; // IST offset in minutes
  const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000); // Get UTC timestamp
  const ISTTimestamp = new Date(utcTimestamp + (ISTOffset * 60000)); // Adjust for IST offset
  const ISTDate = ISTTimestamp.toLocaleDateString(); // Get IST date
  const ISTTime = ISTTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Get IST time
  return { date: ISTDate, time: ISTTime };
};

const AdminPanel = () => {

  const { admin, setAdmin } = useAdmin();

  const { emailId, name:adminUserName, accessToken } = admin || {};

  const socket = useMemo(() => io(port, {
    auth: {
      token: accessToken,
      code:"7812"
    }
  }), []);


  const [chatMessages, setChatMessages] = useState<UserMessages>({}); //use array instead of object
  const [message, setMessage] = useState<string>("");
  const [users, setUsers] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [username, setUsername] = useState<UsernameType>({});
  // const [isAgentJoined, setIsAgentJoined] = useState(false);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playStatus, setPlayStatus] = useState<boolean>(false);
  const [startCounter, setStartCounter] = useState<number>(0);
  const [stopCounter, setStopCounter] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [disconnectLoading, setDisconnectLoading] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  
  // console.log("chat-messages: ", chatMessages);
  notificationAudioRef.current = useMemo(()=> new Audio(notifySound), []) 

  const sendMessage = (message: string) => {
    // console.log("Sending Message");
    const time = getUniversalDateTime();
    if(message.length>0){
    socket.emit("room-message", {roomId: roomId, message, sender:adminUserName, type:"text", time, email:emailId});
    }
  } 
  
  const handleKeyPress = (e:React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(enter_key_send && e.key === 'Enter'){
        sendMessage(e.currentTarget.value)
        // e.currentTarget.value = ""
        setMessage("");
    }else{
       socket.emit("typing", {room: roomId, username: adminUserName})
    }
  }

  const handleSendFileUser = async (file:File) => {
   
    if(roomId.length === 0){
      console.log("FIle not sent")
      return;
    }
    console.log("Sending File: ", roomId);
    setIsUploading(true);
    let fileType;
    if (file.type.includes("image/")) {
      fileType = "image";
    } else if (file.type.includes("video/")) {
      fileType = "video";
    } else if (file.type.includes("audio/")) {
      fileType = "audio";
    } else {
      fileType = "other";
    }

    const time = getUniversalDateTime();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);
    formData.append("sender", adminUserName || "");
    formData.append("roomId", roomId);
    formData.append("time", time);
    formData.append("email", emailId || "");
    //add FILE UPLOAD Progress
    
    try{
       await axios.post(port+"/api/upload",formData, {
        headers:{
          "Content-Type": "multipart/form-data;",

        },
        onUploadProgress: (data) => {
          setUploadProgress(Math.round((data.loaded / (data.total || 100)) * 100));
        },
      });
      // const data = await res.data();
      // console.log("File Uploaded: ", res.data);

    }catch(err){
      console.log("Error while uploading file: ", err);
    }
    setUploadProgress(0);
    setIsUploading(false);
  };

  const sendTranscript = async () => {
    console.log("Sending Transcript")
    setLoading(true);
    // const room = users.find(user => user.roomId === roomId);
    // console.log("Room: ", room)
    try{
    const res = await fetch(port+"/api/send-transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({emailId: emailId, transcript:chatMessages[roomId]})
    });
    const data = await res.json();
    console.log("Transcript sent: ",data);
 
    
  }catch(err){
    console.log("Error while sending transcript: ",err);
    alert("Error while sending transcript");
  }finally{
    setLoading(false);
  }
    
  }

  const handleDisonnect = () => { 
    setDisconnectLoading(true);
    socket.emit("leave-room", {roomId, type: "Agent", name:adminUserName});
    setRoomId("");
    setDisconnectLoading(false);
  }



  useEffect(() => {
    // console.log("Admin Panel: ", emailId)
    socket.emit("agent-connected", emailId);
   
    socket.on("connect", () => {
     console.log("Admin Connected to SOCKET with id: ", socket.id)
    })


    socket.on('connect_error', (error) => {
      console.log('Connection error:', error.message);
      if(error.message === "Authentication error"){
        setError("Authentication Error. Please login again");
        setTimeout(() => {
          setAdmin(null);
        }, 2000);
      }
    });

    socket.on('error', (error) => {
      console.log('Socket error:', error);
    });

    socket.on("notifyAgent", () => {
      // setIsAgentJoined(false);
         console.log("New User Joined. Playing Notification Sound")
        //  startNotificationSound();

    })

    socket.on("agent-joined", (message: string) => {
        console.log("Agent Joined: ", message);
        // stopNotificationSound(); 

    })


    //user array to store all messages instead of object
    socket.on("recieve-message", (data: { roomId: string, message: string, sender:string, type:string, time:string, email:string }) => {
      // const { time } = getISTTimestamp();
      console.log("Socket Id: ", socket.id);
      console.log("Recieved Message: ", data);
      const { time:ISTtime } = getISTTimestamp();
      const { roomId, message, sender, type, time, email } = data;
      const localTime = convertToCurrentTimeZone(time);

      setChatMessages(prevMessages => {
        const newMessages = { ...prevMessages };
        if (!newMessages[roomId]) {
          newMessages[roomId] = [];
        }
        
        newMessages[roomId] = [
          ...newMessages[roomId],
          { message, sender, type, time: localTime || ISTtime, email}
        ];
        return { ...newMessages };
      });
    });

    socket.on("fetch-users", (rooms: Room[]) => {
      let nonConnectedUser = false;
      setUsers(rooms);
      if(rooms.length>0){
        console.log("Users : ", rooms)
        rooms.forEach(user => {
          if(emailId===user.agentEmailId){
            socket.emit("join-room", {roomId:user.roomId, agentEmailId:emailId, name:adminUserName});
            setRoomId(user.roomId);
          }else if(user.agentEmailId===""){
            nonConnectedUser = true;
          }
        })
      }

      if(nonConnectedUser){
        startNotificationSound();
        setPlayStatus(true);
      }else{
        stopNotificationSound();
        setPlayStatus(false);
      }


    })




    socket.on("user-typing", (data: { room: string, username: string }) => {
      setUsername(prevUsernames => {
        return { ...prevUsernames, [data.room]: data.username };
      });
      const timeoutId = setTimeout(() => {
        setUsername(prevUsernames => {
          const newUsername = { ...prevUsernames };
          delete newUsername[data.room];
          return newUsername;
        });
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    });

    socket.on("user-left", (data:{roomId:string, message:string, sender:string, type:string }) => {
      setChatMessages(prevMessages => {
        const newMessages = { ...prevMessages };
        if (!newMessages[data.roomId]) {
          newMessages[data.roomId] = [];
        }
        newMessages[data.roomId] = [
          ...newMessages[data.roomId],
          { message: data.message, sender: data.sender, type: data.type, time: getISTTimestamp().time }
        ];
        return newMessages;
      });
      
  });

  socket.on("saved-messages", (savedMessages:string, roomId:string) => {
    // console.log("savedMessages: ", savedMessages)
    const getMessages = savedMessages.split("###");
    console.log(roomId)
    console.log("after splitting: ", getMessages)
    const finalMessages = getMessages
                            .slice(0, -1) // Remove the last element
                            .map(msg => {
                              const parsedMsg = JSON.parse(msg);
                              const localTime = convertToCurrentTimeZone(parsedMsg.time);
                              return {
                                type: parsedMsg.type,
                                sender: parsedMsg.sender,
                                message: parsedMsg.message,
                                time: localTime,
                                email: parsedMsg.email
                              }
                            } );
    console.log("finalMessages: ", finalMessages); 
    setChatMessages(prevMessages => {
                              const newMessages = { ...prevMessages };
                              if (!newMessages[roomId]) {
                                newMessages[roomId] = [];
                              }
                              
                              newMessages[roomId] = finalMessages
                              return { ...newMessages };
                            });
       })


    return () => {
      console.log("Admin Disconnected")
      socket.emit("agent-disconnected", emailId);
      // socket.emit("leave-room", {roomID:roomId, type: "Agent", name:emailId});
      socket.disconnect();
      clearInterval(notificationIntervalRef.current || undefined);
    }
  }, []);




  const startNotificationSound = () => {
    stopNotificationSound();
    if (!playStatus) {
      console.log("Playing Notification Sound", startCounter);
      setStartCounter(prevCounter => prevCounter + 1); // Increment startCounter
      notificationIntervalRef.current = setInterval(() => {
        if (notificationAudioRef.current) {
          notificationAudioRef.current.play();
        }
      }, 5000);
      setPlayStatus(true);
    }
  };
  
  const stopNotificationSound = () => {
    console.log("Stopping Notification Sound", stopCounter);
    setStopCounter(prevCounter => prevCounter + 1); // Increment stopCounter
    if (notificationAudioRef.current) {
      notificationAudioRef.current.pause();
      notificationAudioRef.current.currentTime = 0;
    }
    clearInterval(notificationIntervalRef.current || undefined);
    notificationIntervalRef.current = null;
    setPlayStatus(false);
  };
  

  const handleJoinRoom = (roomId:string) => {
    socket.emit("join-room", {roomId, agentEmailId:emailId, name:adminUserName});
      setRoomId(roomId);
  }

  const handleLogout = async () => {
    setLoggingOut(true); // Set loggingOut to true before initiating the logout process
  
    users.forEach((user) => {
      if (emailId === user.agentEmailId) {
        console.log("Leaving Room: ", user.roomId);
        socket.emit("leave-room", { roomId: user.roomId, type: "Agent", name: adminUserName });
      }
    });
  
  
    try {
      const res: any = await axios.get(port + "/api/logout", {
        withCredentials: true,
      });
      console.log(res.data);
      // if (!res?.data) throw new Error("Logout failed");
    } catch (err) {
      console.log(err);
    } finally {
      socket.disconnect();
      setAdmin(null);
      setLoggingOut(false); // Set loggingOut to false after the logout process is completed
    }
  };

  return (
    <>
    <div className="flex  justify-between w-full">
        <h1 className="text-2xl font-semibold mb-4 underline">Admin Panel [{adminUserName}]</h1>
        <div className="flex gap-4">
          {/* <button onClick={()=> play()} className="btn btn-outline">Play</button>
          <button onClick={()=> stop()} className="btn btn-outline">Stop</button> */}
          <button disabled={loading || roomId === ""} className="btn btn-outline btn-primary btn-sm" onClick={() => { if (chatMessages[roomId]) sendTranscript() }}>
            {loading ? <span className="loading loading-infinity text-primary"></span> : "Send Chat Transcript"}
          </button>
          <button disabled={loading || roomId === ""} className="btn btn-outline btn-primary btn-sm" onClick={handleDisonnect}>
            {disconnectLoading ? <span className="loading loading-infinity text-primary"></span> : "Disconnect"}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
          {loggingOut ? <span className="loading loading-infinity text-primary"></span> : "Logout"}
        </button>
        </div>        
    </div>
    
    <div className="flex gap-x-4">
    <div className="flex flex-col gap-4  my-4 w-3/12 ">
           { users && users.map((user, index) => {

              if(user.agentEmailId==="" || user.agentEmailId === emailId){
                  // if(user.agentEmailId === emailId){
                  //   handleJoinRoom(user.roomId);
                  // }
               return(
                <div key={index} className={`flex justify-between border-2 rounded-md p-2 bg-base-200 relative cursor-pointer ${roomId===user?.roomId && "border-green-500"}`}
                        onClick={()=>{if(emailId===user.agentEmailId) setRoomId(user?.roomId)}}>
                   <h2 className="text-sm ">{index+1+": User-"+ user?.userName}</h2>
                   <button disabled={emailId===user.agentEmailId} className="btn btn-xs btn-neutral" onClick={()=> handleJoinRoom(user?.roomId)}>{emailId===user.agentEmailId? "connected": "Take"}</button>
                </div>)
              }
            })} 

    </div>
    <div className="w-9/12">
    {error && <p className="text-left py-4 px-4 text-red-500 text-md">{error}</p>}
    <ChatArea message={message}
              setMessage={setMessage}
              chats={chatMessages[roomId] || []}
              sendMessage={sendMessage}
              handleKeyPress={handleKeyPress}
              username={username[roomId] || ""}
              handleSendFileUser={handleSendFileUser}
              // name={adminUserName || ""}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              email={emailId}
              border={true} />
              
    </div>
    </div>
    {/* <audio ref={soundRef} src={messageSound} /> */}
    </>
  )
}

export default AdminPanel
