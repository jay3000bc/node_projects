import React, { createContext, useContext, useState } from 'react';
import { UserType, AdminType } from '../types';

// Create context for user
interface UserContextType {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
}

const initialUserContextValue: UserContextType = {
  user: null,
  setUser: () => {},
};

export const UserContext = createContext<UserContextType>(initialUserContextValue);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
};

// Create context for admin
interface AdminContextType {
  admin: AdminType | null;
  setAdmin: React.Dispatch<React.SetStateAction<AdminType | null>>;
}

const initialAdminContextValue: AdminContextType = {
  admin: null,
  setAdmin: () => {},
};

export const AdminContext = createContext<AdminContextType>(initialAdminContextValue);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminType | null>(null);

  return <AdminContext.Provider value={{ admin, setAdmin }}>{children}</AdminContext.Provider>;
};

// Custom hook to access user context
export const useUser = () => useContext(UserContext);

// Custom hook to access admin context
export const useAdmin = () => useContext(AdminContext);