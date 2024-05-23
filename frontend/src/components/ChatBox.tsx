import React, { useState } from 'react';
import ChatboxLogin from './ChatboxLogin';
import { chatIcon, chatTitle, chatDescription } from '../config';
import ChatboxChatArea from './ChatboxChatArea';
import { useUser } from '../context/AuthContext';



const ChatBox: React.FC = () => {
  const { user } = useUser();
  const [isChatboxOpen, setIsChatboxOpen] = useState<boolean>(user ? true : false);


  const toggleChatbox = () => {
    // if(isChatboxOpen && user){
    //   setUser(null);
    // } 
    setIsChatboxOpen(!isChatboxOpen);
  };



  return (
    <div>
      {!isChatboxOpen ?
      <div className="fixed bottom-0 right-0 mb-4 mr-4">
        <button
          id="open-chat"
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300 flex items-center"
          onClick={toggleChatbox}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
          Chat with an Agent
        </button>
      </div>
       : (
        <div id="chat-container" className="fixed bottom-5 right-4 w-96">
          <div className="bg-white shadow-md rounded-lg max-w-lg w-full">
            <div className={` ${user? "py-4" : "py-8"} px-4 border-b  bg-blue-500 text-white rounded-t-lg flex justify-between `}>
              <div className={` ${user? "flex items-center gap-2" : ""} pl-4 space-y-2`}>
              {chatIcon(25)}
               <p className="text-xl font-semibold text-left">{chatTitle}</p>
              {!user && <p className="text-sm font-normal text-left">{chatDescription}</p>
              }
              </div>
              <button
                id="close-chat"
                className="self-start text-white hover:text-red-500 focus:outline-none focus:text-red-500"
                onClick={toggleChatbox}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className={`min-h-[500px] ${user ? "bg-white" : "bg-gray-100"} `}> 
              {
                user ? (
                  <ChatboxChatArea />
                ) : (
                  <ChatboxLogin />
                )
              }
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
