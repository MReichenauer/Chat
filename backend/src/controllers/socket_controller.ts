/**
 * Socket Controller
 */
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketTypes";
import Debug from "debug";
import { Server, Socket } from "socket.io";
import prisma from "../prisma";
// import { getRooms } from "../../server";
// Create a new debug instance
const debug = Debug("chat:socket_controller");


// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>) => {
	debug("A user connected", socket.id)

	// Say hello to the user
	socket.emit("hello");
	debug("Said hello the the user", socket.id)

	// Listen for room list request
	socket.on("getRoomList", async (callback) => {
		debug("Got request for rooms");

		// Query database for list of rooms
		const rooms = await prisma.room.findMany();
		debug("Found rooms, sending list of rooms %o", rooms);

		// Send room list
		setTimeout(() => {
			callback(rooms);
		}, 1500)

	});



	// Listen for a message
	socket.on("sendChatMessage", (msg) => {
		debug("NEW MESSAGE", socket.id, msg);

		// Broadcast message to everyone connected to chat(room) except the sender
		socket.to(msg.roomId).emit("chatMessage", msg);
	});

	// Listen for a user join request
	socket.on("userJoinRequest", async (username, roomId, callback) => {
		debug("User %s wants to join the chat in room %s", username, roomId);

		// Get room from database
		const room = await prisma.room.findUnique({
			where: {
				id: roomId,
			}
		});
		// If room was not found, respond with success: false
		if (!room) {
			callback({
				success: false,
				room: null,
			});
			return;
		}
		// Join the user to the selected room
		socket.join(roomId);

		// Let everyone know user joined the room
		io.to(roomId).emit("userJoined", username, Date.now());

		// Respond with room info
		// Here we could check if username is uniq
		callback({
			success: true,
			room: {
				id:room.id,
				name:room.name,
				users:[],
			}
		});
	});

	// Handle user disconnecting
	socket.on("disconnect", () => {
		debug(`A user disconnected, ${socket.id}`);
	});
}


