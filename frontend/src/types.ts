export type messageTypes ={
    roomId?: string,
    type: string,
    message: string,
    sender: string,
    time?:string,
    email?:string,
}

export type UserType = {
    emailId: string,
    username: string,
    message?:string,
    accessToken: string,
  }

 export type UserLoginProps = {
    setAuth: (auth: UserType) => void
}

export type UserChatBoxProps = {
    auth: UserType;
    setAuth: React.Dispatch<React.SetStateAction<UserType | null>>;
   
  }


export type AdminType = {
    emailId: string,
    name: string,
    accessToken: string,
  }