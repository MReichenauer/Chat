/**
 * Socket Controller
 */
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketTypes";
import Debug from "debug";
import { Socket } from "socket.io"
// Create a new debug instance
const debug = Debug("chat:socket_controller");


// Handle a user connecting
export const handleConnection = (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
	debug("A user connected", socket.id)

	// Say hello to the user
	socket.emit("hello");
	debug("Said hello the the user", socket.id)

	// Listen for a message
	socket.on("sendChatMessage", (msg) => {
		debug("NEW MESSAGE", socket.id, msg)

		// Broadcast message to everyone connected to chat except the sender
		socket.broadcast.emit("chatMessage", msg);
	});

	// Listen for a user join request
	socket.on("userJoinRequest", (username, callback) => {
		debug("User %s wants to join the chat", username);

		// Always let the user in (for now)
		callback(true);

		// // Emit userJoined to notify other users
		socket.broadcast.emit("userJoined", username, Date.now());
	});

	// Handle user disconnecting
	socket.on("disconnect", () => {
		debug(`A user disconnected, ${socket.id}`);
	});
}


