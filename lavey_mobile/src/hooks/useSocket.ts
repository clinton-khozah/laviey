import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { storage } from '../utils/storage';

export function useSocket(onChatUpdate: () => void) {
  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (!url) return;
    const socket = io(url, { transports: ['websocket'], autoConnect: false });
    void storage.getSession().then((session) => { socket.auth = { token: session?.token }; socket.connect(); });
    socket.on('message:new', onChatUpdate); socket.on('conversation:updated', onChatUpdate);
    return () => { socket.off('message:new', onChatUpdate); socket.off('conversation:updated', onChatUpdate); socket.disconnect(); };
  }, [onChatUpdate]);
}
