import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAppData } from './useAppData';
import { isGuestUser } from './appState';

const SocketContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { isAuthenticated, currentUser } = useAppData();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let newSocket;
    const token = typeof window !== 'undefined' 
      ? (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken'))
      : null;

    if (isAuthenticated && !isGuestUser(currentUser) && token) {
      newSocket = io(API_BASE_URL, {
        auth: { token }
      });
      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, currentUser]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
