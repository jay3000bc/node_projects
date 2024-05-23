import { messageTypes } from "../types"
import { useEffect, useMemo, useRef, useState} from "react";
import {io } from 'socket.io-client';
import axios from 'axios';
import ChatArea from "./ChatArea"
// import useSendTranscript from "../hooks/useSendTranscript";
import { port, send_Transcript, enter_key_send } from "../config";
import { useUser } from "../context/AuthContext";

// Function to get the universal date and time
function getUniversalDateTime(): string {
  const date = new Date();
  const universalDateTime: string = date.toISOString();
  return universalDateTime;
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

const ChatboxChatArea = () => {

  const { user, setUser} = useUser();
  const { emailId, username:name, accessToken }  = user || {};
  const socket = useMemo(() => io(port, {
    auth: {
      token: accessToken,
      code:'7811'
    }
  }), []);

  // const { sendTranscript } = useSendTranscript();

const [message, setMessage] = useState<string>("");
const [chatMessages, setChatMessages] = useState<messageTypes[]>([]);
const [username, setUsername] = useState<string>("");
const [roomID, setRoomID] = useState<string>("");
const [queueStatus, setQueueStatus] = useState<string>("");
// const [connectToQueue, setConnectToQueue] = useState<boolean>(false);
const [error, setError] = useState<string>("");
// Create a ref to store the roomID
const roomIdRef = useRef<string>("");
const [showModal, setShowModal] = useState<boolean>(false);
// const [loading, setLoading] = useState<boolean>(false);
const [isChecked, setIsChecked] = useState<boolean>(false);
const [agentLeftModal, setAgentLeftModal] = useState<boolean>(false);
const [uploadProgress, setUploadProgress] = useState<number>(0);
const [isUploading, setIsUploading] = useState<boolean>(false);
const [logoutLoading, setLogoutLoading] = useState<boolean>(false);

const setMessages = (data: messageTypes) => {
  const { time:ISTtime } = getISTTimestamp();
  const { sender, message, type, time, email } = data;
  const localTime = convertToCurrentTimeZone(time || ISTtime);
  
  setChatMessages((prevMessages) => [...prevMessages, {type, sender, message, time: localTime, email}])
}
  

const sendMessage = (message:string) => {
    console.log("Sending Message", roomID);
    const universalDateTime = getUniversalDateTime();
    socket.emit("room-message", {roomId: roomID, message, sender:name, type:"text", time:universalDateTime, email:emailId})
   
  }

const handleKeyPress = (e:  React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(enter_key_send && e.key === 'Enter'){
        sendMessage(e.currentTarget.value)
        setMessage("");
    }else{
       socket.emit("typing", {room: roomID, username: name})
    }
}


const sendTranscript = async () => {
  console.log("Sending Transcript")
  // setLoading(true);
  // const room = users.find(user => user.roomId === roomId);
  // console.log("Room: ", room)
  try{
  const res = await fetch(port+"/api/send-transcript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({emailId: emailId, transcript:chatMessages})
  });
  const data = await res.json();
  console.log("Transcript sent: ",data);

}catch(err){
  console.log("Error while sending transcript: ",err); 
}
  
}

const handleLogout =async  (roomID:string, transcriptStatus:boolean) => {
  console.log("Ending Chat", roomID, isChecked);
  setLogoutLoading(true);
  if(send_Transcript && transcriptStatus){
    await sendTranscript();
  } 
   socket.emit("leave-room", {roomId:roomID, type: "User", name, email:emailId });
   socket.disconnect();
   roomIdRef.current = "";
   try{
    
    const res:any = await axios.get(port+"/api/logout",
    {
      withCredentials: true,
    });
    console.log(res.data)
    // if (!res?.data) throw new Error("Logout failed");

  }catch(err){
    console.log(err)
  }finally {
    setLogoutLoading(false);
    setUser(null);
  }
  
}



const handleSendFileUser = async (file:File) => {
  if(queueStatus.length>0) {
    setError("Please wait for an agent to join the chat");
    setTimeout(() => {
      setError("");
    }, 2000);
    return;
  }
  console.log("Sending File: ", file);
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
  formData.append("sender", name || "");
  formData.append("roomId", roomID);
  formData.append("time", time);
  formData.append("email", emailId || "");

  try{
    const res = await axios.post(port+"/api/upload",formData, {
      headers:{
        "Content-Type": "multipart/form-data;",
        
      },
      onUploadProgress: (data) => {
        setUploadProgress(Math.round((data.loaded / (data.total || 100)) * 100));
      },
    });
    // const data = await res.data();
    console.log("File Uploaded: ", res.data);

  }catch(err){
    console.log("Error while uploading file: ", err);
  }finally{
    setUploadProgress(0);
    setIsUploading(false);
  }
  
};

useEffect(() => {

  socket.on("saved-messages", (savedMessages:string, roomId:string) => {
    // console.log("savedMessages: ", savedMessages)
    const getMessages = savedMessages.split("###");
    console.log(roomId)
    
    const finalMessages = getMessages
                            .slice(0, -1) // Remove the last element
                            .map(msg => {
                              const parsedMsg = JSON.parse(msg);
                              const localTime = convertToCurrentTimeZone(parsedMsg.time);
                              // if(parsedMsg.type === "notify" && parsedMsg.email === emailId){ 
                                
                              //   if(parsedMsg.message.includes("joined")){
                              //   return{
                              //     type: parsedMsg.type,
                              //     sender: parsedMsg.sender,
                              //     message: "You have joined this chat ",
                              //     time: localTime,
                              //     email: parsedMsg.email
                              //   }}else if(parsedMsg.message.includes("left")) {
                              //     return{
                              //       type: parsedMsg.type,
                              //       sender: parsedMsg.sender,
                              //       message: "You have left this chat",
                              //       time: localTime,
                              //       email: parsedMsg.email
                              //   }
                              // }
                              return {
                                type: parsedMsg.type,
                                sender: parsedMsg.sender,
                                message: parsedMsg.message,
                                time: localTime,
                                email: parsedMsg.email
                              }
                            } );
        // console.log("finalMessages: ", finalMessages);
        setChatMessages(finalMessages);
  })

    socket.on("connect", () => {
      console.log("User Connected to Socket with id: ", socket.id)
    })
    
    console.log("emailId", emailId, name)
    if(emailId) socket.emit("user-connect", emailId, name);

    socket.on('connect_error', (error) => {
      console.log('Connection error:', error.message);
      if(error.message === "Authentication error"){
        setError("Authentication Error. Please login again");
        setTimeout(() => {
          setUser(null);
        }, 2000);
      }
    });

    socket.on('error', (error) => {
      console.log('Socket error:', error);
    });
    socket.on("queue-status", (status: string) => {
        setQueueStatus(status);
    })

    socket.on("recieve-message", (data: messageTypes) => {
      console.log(data)
        setMessages(data);
        socket.emit("save-message", data) 
      })

    socket.on("room-id", (roomID: string) => {
        console.log("Room ID: ", roomID)
        setRoomID(roomID);
        roomIdRef.current = roomID;
    })

    // socket.on("file", (url=> console.log(url)))

    
    socket.on("user-typing", (data:{room:string, username:string}) => {
        setUsername(data.username);
        const timeoutId = setTimeout(() => setUsername(""), 1500);
        // Returning a cleanup function to clear the timeout
        return () => clearTimeout(timeoutId);
    })
    

    socket.on("agent-joined", (data: messageTypes) => {
      setMessages(data);
      // socket.emit("save-message", data)
    });

    socket.on("user-left", (data:messageTypes) => {
      setMessages(data);
      // socket.emit("save-message", data) 
      const timeoutId=setTimeout(() => {
        // handleLogout(roomIdRef.current);
        setAgentLeftModal(true);

      }, 1000);
      return () => clearTimeout(timeoutId);
    });

   

    // if(connectToQueue) socket.emit("user-connect", emailId);

    return () => {
        //  socket.disconnect()
        // handleLogout(roomIdRef.current);
        }
    },[]);


  return (
    <div>
            {error && <p className="text-left py-4 px-4 text-red-500 text-md">{error}</p>}
            {queueStatus && <p className="text-left py-4 px-4 text-gray-500 text-md">{queueStatus}</p>} 
            <button onClick={() => setShowModal(true)} className="btn btn-outline btn-sm my-2">
              End Chat
            </button>

            <ChatArea  message={message}
                       setMessage={setMessage}
                       chats={chatMessages}
                       sendMessage={sendMessage}
                       handleKeyPress={handleKeyPress}
                       username={username}
                       handleSendFileUser={handleSendFileUser}
                       uploadProgress={uploadProgress}
                       isUploading={isUploading}
                      //  name={name || ""}
                       email={emailId}
                       border={false} />


              {showModal && (
                      <div
                        className= {`z-10 absolute inset-0 overflow-y-auto flex items-center justify-center`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                        // onClick={() => setShowModal(false)}
                      >
                        <div className={` bg-white rounded-lg p-6`}>
                          <h2 className="text-md font-semibold text-center py-4">
                            Are you sure you want to end the chat?
                          </h2>

                          <div className="form-control w-7/12 mx-auto">
                            <label className="cursor-pointer label">
                              <span className="label-text">Send Chat Transcript</span>
                              <input type="checkbox"  checked={isChecked}
                                      onChange={()=> setIsChecked(!isChecked)} className="checkbox  checkbox-xs checkbox-blue-500" />
                            </label>
                          </div>

                          <div className="flex justify-around mt-4 py-4">
                            <button
                              onClick={() => setShowModal(false)}
                              className="px-4 btn btn-outline btn-sm"
                              disabled={logoutLoading}
                            >
                              No
                            </button>
                            <button
                              onClick={() => handleLogout(roomIdRef.current, isChecked)}
                              className="px-4 btn bg-blue-500 text-white hover:text-blue-500 hover:bg-white hover:border-blue-500 btn-sm"
                              disabled={logoutLoading}
                            >
                              {logoutLoading ? 'ending...' : 'Yes'}
                            </button>
                          </div>
                          {/* <img src={message} alt="Full Image" className="max-w-full max-h-[80vh]" /> */}
                        </div>
                      </div>
                    )}

                {agentLeftModal && (
                      <div
                        className= {`z-10 absolute inset-0 overflow-y-auto flex items-center justify-center`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                        // onClick={() => setShowModal(false)}
                      >
                        <div className={` bg-white rounded-lg p-6 mx-4`}>
                          <h2 className="text-md font-semibold text-center py-4">
                            Agent has ended the chat. Do you wish to get the chat transcript?
                          </h2>

                        
                          <div className="flex justify-around mt-4 py-4">
                            <button
                              onClick={() => { 
                                setIsChecked(false);
                                handleLogout(roomIdRef.current, false);
                                setAgentLeftModal(false);
                              }}
                              className="btn btn-outline btn-sm px-4"
                              disabled={logoutLoading}
                            >
                              No
                            </button>
                            <button
                              onClick={() => {
                                setIsChecked(true);
                                handleLogout(roomIdRef.current, true);
                                }}
                              className=" px-4 btn bg-blue-500 text-white hover:text-blue-500 hover:bg-white hover:border-blue-500 btn-sm"
                              disabled={logoutLoading}
                              >
                             {logoutLoading ? 'ending...' : 'Yes'}
                            </button>
                          </div>
                          {/* <img src={message} alt="Full Image" className="max-w-full max-h-[80vh]" /> */}
                        </div>
                      </div>
                    )}
    </div>
  )
}

export default ChatboxChatArea