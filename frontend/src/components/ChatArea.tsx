import React, { useRef, useEffect, useState } from 'react';
import { fileSize, fileTypes } from '../config';
import { messageTypes } from '../types';

type ChatAreaProps = {
  message: string;
  setMessage: (message: string) => void;
  chats: messageTypes[];
  sendMessage: (message: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  username: string;
  handleSendFileUser?: (file: File) => void;
  // name: string;
  uploadProgress?: number;
  isUploading?: boolean;
  email?: string;
  border:boolean
};

type ChatMessageProps = {
  sender: string;
  message: string;
  time: string;
  isUser?: boolean;
};


 // Function to get current timestamp in IST with separated date and time
 const getISTTimestamp = ():{date:string, time:string} => {
  const now = new Date();
  const ISTOffset = 330; // IST offset in minutes
  const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000); // Get UTC timestamp
  const ISTTimestamp = new Date(utcTimestamp + (ISTOffset * 60000)); // Adjust for IST offset
  const ISTDate = ISTTimestamp.getDate();
  const ISTMonth = ISTTimestamp.getMonth() + 1; // Month is zero-indexed, so add 1
  const ISTYear = ISTTimestamp.getFullYear();

  // Pad single-digit day and month with leading zeros if necessary
  const formattedDay = ISTDate < 10 ? '0' + ISTDate : ISTDate;
  const formattedMonth = ISTMonth < 10 ? '0' + ISTMonth : ISTMonth;

  const ISTDateFormatted = formattedDay +"/"+ formattedMonth +"/"+ ISTYear; // Concatenate in ddmmyyyy format
  const ISTTime = ISTTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Get IST time
  return { date: ISTDateFormatted, time: ISTTime };
};

const ChatMessage = ({ sender, message, time, isUser, type }: ChatMessageProps & { type: string }) => {
  const [showModal, setShowModal] = useState(false);

  const handleImageClick = () => {
    setShowModal(true);
  };

  return (
    <div
      className={`relative flex flex-col px-4 py-2 text-gray-700 rounded-lg my-4 mx-2 ${
        isUser ? 'bg-green-100 self-end' : 'bg-gray-100 self-start'
      }`}

      style={{ maxWidth: '80%', }}
    >
      <p className="font-bold text-gray-500 text-xs self-start pb-1 ">{isUser ? 'You' : sender}</p>
      {type === 'text' ? (
        <div className=' w-full text-wrap break-words'>
         <p className="text-left text-gray-700 text-sm whitespace-pre-line">{message}</p>
        </div>
      ) : type === 'image' ? (
        <img
          src={message}
          alt="Sent Image"
          className={` rounded-lg self-start cursor-pointer max-w-[200px] max-h-[200px] `}
          onClick={handleImageClick}
        />
      ) : type === 'video' ? (
        <video src={message} controls className="max-w-[200px] max-h-[200px] rounded-lg self-start" />
      ) : type === 'audio' ? (
        <audio src={message} controls className="self-start" />
      ) : (
        <a href={message} target="_blank" rel="noopener noreferrer" className="self-start pt-1 text-blue-500 underline">
          {message.split('/').pop()}
        </a>
      )}
      <p className="text-xs self-end text-gray-400 pt-2">{time}</p>
      {showModal && (
        <div
          className= {`z-10 fixed inset-0 overflow-y-auto flex items-center justify-center`}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div className={` bg-white rounded-lg p-6`}>
            <img src={message} alt="Full Image" className="max-w-full max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
};

const ChatArea = ({
  message,
  setMessage,
  chats,
  sendMessage,
  handleKeyPress,
  username,
  handleSendFileUser,
  // name,
  uploadProgress,
  isUploading,
  email,
  border
}: ChatAreaProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleClick = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const handleFilePreview = (file: File) => {
    if (file.type.includes('image/') || file.type.includes('video/') || file.type.includes('audio/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(file.name);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Handle File Change: ",event.target.files?.[0])
    try {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > fileSize) {
          alert('File size should be less than 5MB');
          return;
        }
        handleFilePreview(file);
        setFile(file);
        setShowModal(true);
        
        if(fileRef.current){
          fileRef.current.value = "";
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setFilePreview(null);
    setShowModal(false);
  };

  const handleSendFile =async () => {
    if (file) {
      await handleSendFileUser?.(file);
      setShowModal(false);
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > fileSize) {
        alert('File size should be less than 20MB');
        return;
      }
      handleFilePreview(droppedFile);
      setFile(droppedFile);
      setShowModal(true);
    }
  };

  const {date, time} = getISTTimestamp();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  return (
    <section className="relative">
      {/* maintain chats messages length */}
      <div
        className={`overflow-y-auto overflow-x-clip  flex flex-col ${border && "border-[2px] border-gray-300"}  h-[500px] rounded-md pt-4 ${isDragging ? 'bg-gray-200' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {/* Drag and drop indicator */} 
        {isDragging && (
          <div className="flex justify-center items-center h-full absolute inset-0 bg-gray-200 bg-opacity-50">
            <p className="text-gray-600">Drop file here</p>
          </div>
        )}

        {chats &&
          chats.map((chat, index) => {
            switch (chat.type) {
              case 'notify':
                return (
                  <p
                    key={index}
                    className="px-4 py-2 font-semibold text-gray-500 text-sm rounded-lg m-2 bg-gray-100 self-center text-center"
                  >
                    {chat.message+time+", "+date}
                  </p>
                );
              case 'start':
                return null;
              default:
                return (
                  <ChatMessage
                    key={index}
                    message={chat.message}
                    time={chat.time as string}
                    sender={chat.sender}
                    isUser={chat.email === email}
                    type={chat.type}
                  />
                );
            }
          })}

        <div ref={chatEndRef} className="aboslute bottom-2" style={{ height: '40px', minHeight: '40px' }}>
          {username && (
            <p className="text-left text-gray-500 italic pl-4 pt-2" style={{ height: '30px', minHeight: '30px' }}>
              {`${username} is Typing`}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full mt-4 gap-2 items-center border-2 border-gray-300 py-2 rounded-md " >
       <textarea
            value={message}
            onKeyUp={handleKeyPress}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type here"
            className="input-md outline-none grow resize-none"
            style={{ height: `${(message.match(/\n/g) || []).length * 20 + 40}px` }}
          />

          <div className="flex gap-x-2 pr-2">
            <button onClick={handleClick} className="border border-gray-500 p-3 rounded-full">
              <svg
                xmlSpace="preserve"
                width={20}
                height={20}
                viewBox="0 0 511.999 511.999"
              >
                <path d="M466.904 68.854c-60.129-60.127-157.962-60.127-218.091 0l-213.44 213.44c-47.166 47.167-47.161 123.497 0 170.659 47.053 47.051 123.609 47.049 170.659 0l213.441-213.442c33.973-33.973 33.973-89.254 0-123.228-33.974-33.974-89.254-33.974-123.228 0L114.204 298.327c-7.833 7.833-7.833 20.532 0 28.365 7.833 7.833 20.531 7.833 28.365 0L324.61 144.65c18.333-18.336 48.164-18.334 66.497 0s18.333 48.165 0 66.498l-213.44 213.441c-31.412 31.41-82.519 31.41-113.93 0-31.487-31.487-31.484-82.445 0-113.929L277.179 97.219c44.595-44.596 116.77-44.59 161.36 0 44.596 44.595 44.59 116.77 0 161.36l-94.863 94.863c-7.833 7.833-7.833 20.532 0 28.365 7.834 7.833 20.531 7.833 28.365 0l94.863-94.863c60.127-60.127 60.127-157.963 0-218.09z" />
              </svg>
            </button>

            <button
              className="btn btn-outline px-3"
              onClick={() => {
                if (message.length > 0) sendMessage(message);
                setMessage('');
              }}
            >
              Send
            </button>
          </div>
        
      </div>

      {showModal && (
        <div
          className="z-10 fixed inset-0 overflow-y-auto flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white rounded-lg p-6">
            {filePreview && (
              <div className="flex justify-center items-center w-full h-full">
                {filePreview.startsWith('data:image/') || filePreview.startsWith('data:video/') || filePreview.startsWith('data:audio/') ? (
                  <>
                    {filePreview.startsWith('data:image/') && <img src={filePreview} alt="File Preview" className="max-w-[400px] h-auto" />}
                    {filePreview.startsWith('data:video/') && <video src={filePreview} className="max-w-[400px] h-auto" controls />}
                    {filePreview.startsWith('data:audio/') && <audio src={filePreview} controls />}
                  </>
                ) : (
                  <p className="text-gray-700 truncate p-4">{filePreview}</p>
                )}
              </div>
            )}

            
            <div className="modal-action">
            <progress className="progress progress-primary w-56" value={uploadProgress} max="100"></progress>
              <button className="btn" onClick={handleSendFile} disabled={isUploading}>
                Send
              </button>
              <button className="btn" onClick={handleCancel} disabled={isUploading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="file" id="file" ref={fileRef} onChange={handleChange} accept={fileTypes} style={{ display: 'none' }} />
    </section>
  );
};

export default ChatArea;
