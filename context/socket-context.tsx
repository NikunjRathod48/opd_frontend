"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // Only connect if user is authenticated and we have the backend URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com";

        // Convert API URL (e.g., http://localhost:5000/api) to base URL for socket
        const baseUrl = backendUrl.replace(/\/api$/, "");

        const socketInstance = io(baseUrl, {
            autoConnect: false,
            reconnection: true,
            transports: ["websocket", "polling"],
        });

        const hospitalId = (user as any)?.hospitalid || (user as any)?.hospital_id || (user as any)?.hospitalId;

        if (user && hospitalId) {
            socketInstance.connect();

            socketInstance.on("connect", () => {
                setIsConnected(true);
                console.log("WebSocket Connected");
                // Join the specific hospital room
                socketInstance.emit("joinHospital", hospitalId);
            });

            socketInstance.on("disconnect", () => {
                setIsConnected(false);
                console.log("WebSocket Disconnected");
            });

            setSocket(socketInstance);
        }

        return () => {
            if (socketInstance) {
                socketInstance.disconnect();
            }
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
