export {}
import { Room, User } from "./Models"
// Events emitted by the server to the client
export interface ServerToClientEvents {
    hello: () => void;
    chatMessage: (msg: ChatMessageData) => void;
    userJoined: (username: string, timestamp: number) => void;
    
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    sendChatMessage: (msg: ChatMessageData ) => void;
    userJoinRequest: (username: string, roomId: string, callback: (response: UserJoinResponse) => void) => void;
    getRoomList: (callback: (rooms: Room[]) => void) => void;
}

// // Events between servers
// export interface InterServerEvents {
// }

// Message payload
export interface ChatMessageData {
    content: string;
    timestamp: number;
    username: string;
    roomId: string;
}

export interface RoomWithUsers extends Room {
    users: User[];
}

// User join response
export interface UserJoinResponse {
    success: boolean;
    room: RoomWithUsers | null; 
}
