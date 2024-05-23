import { port } from "../config";
import { messageTypes } from "../types";



const useSendTranscript = () => {
  
    const sendTranscript = async (emailId:string, chatMessages: messageTypes[]) => {
      console.log("Sending Transcript")
      try {
        const res = await fetch(port + "/api/send-transcript", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ emailId, transcript: chatMessages })
        });
        const data = await res.json();
        console.log("Transcript sent: ", data);
        if (data.success) {
          alert("Transcript sent successfully");
        }
      } catch (err) {
        console.log("Error while sending transcript: ", err);
      }
    };
  

    
    // You can return any values or functions that you want to expose to components using this hook
    return {
      sendTranscript // Exposing the sendTranscript function
    };
  };
  
  export default useSendTranscript;