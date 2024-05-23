interface User {
    password: string;
  }
  
  const users: Record<string, User> = {
    "deep@gmail.com": {
      password: "password",
    },
    "mike@gmail.com": {
      password: "password",
    },
    "dan@gmail.com": {
      password: "password",
    },
    "iamdpunkr@gmail.com": {
      password: "password",
    },
  };
  
  const admins: Record<string, User> = {
    "jay@gmail.com": {
      password: "password",
    },
    "syed@gmail.com": {
      password: "password",
    },
   
  };
  
  export const findUser = (email: string, password: string, userType: 'user' | 'admin'): boolean => {
    const data = userType === 'user' ? users : admins;
    const user = data[email];
    return !!user && user.password === password;
  };
  