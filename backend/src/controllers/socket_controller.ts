import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketTypes";
import Debug from "debug";
import { Server, Socket } from "socket.io";
import prisma from "../prisma";
import { getUsersInRoom } from "../services/UserService";
import { getRoom, getRooms } from "../services/roomService";
import { createMessage, getLatestMessages } from "../services/messageService";

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
		const rooms = await getRooms();
		debug("Found rooms, sending list of rooms %o", rooms);

		// Send room list
		setTimeout(() => {
			callback(rooms);
		}, 1500)

	});

	// Listen for a message
	socket.on("sendChatMessage", async(msg) => {
		debug("NEW MESSAGE", socket.id, msg);

		// Broadcast message to everyone connected to chat(room) except the sender
		socket.to(msg.roomId).emit("chatMessage", msg);

		// Save msg to DB
		await createMessage(msg);

	});

	// Listen for a user join request
	socket.on("userJoinRequest", async (username, roomId, callback) => {
		debug("User %s wants to join the chat in room %s", username, roomId);

		// Get room from database
		const room = await getRoom(roomId)
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

		// Create a User in the database and set roomId
		const user = await prisma.user.create({
			data: {
				id: socket.id,
				roomId,
				username,
			},
		});
		debug("Created user: %o", user);

		// Retrieve users from database
		const usersInRoom = await getUsersInRoom(roomId);
		debug("List of users in room %s (%s): %O", room.name, roomId, usersInRoom)

		// Let everyone know user joined the room
		io.to(roomId).emit("userJoined", username, Date.now());

		// Retrieve message sent to the room
		const messages = await getLatestMessages(roomId, 1 * 60 * 60);

		// Respond with room info
		callback({
			success: true,
			room: {
				id: room.id,
				name: room.name,
				users: usersInRoom,
				messages,
			},
		});

			// emit a new list of users in the room to everyone in THAT room
			socket.to(roomId).emit("onlineUsers", usersInRoom);
	});

	// Handle user disconnecting
	socket.on("disconnect", async () => {
		debug(`A user disconnected, ${socket.id}`);

		// Find user in order to know which room user was in (if any)
		const user = await prisma.user.findUnique({
			where: {
				id: socket.id,
			}
		});

		// If user didn't exist, do nothing
		if (!user) {
			return;
		}

		// Remove user
		await prisma.user.delete({
			where: {
				id: socket.id,
			},
		});

		// Retrieve a list of Users for the Room
		const usersInRoom = await getUsersInRoom(user.roomId);

		// Broadcast a notice to the room that the user has left
		io.to(user.roomId).emit("userLeft", user.username, Date.now());

		// Broadcast a new list of users in the room
		io.to(user.roomId).emit("onlineUsers", usersInRoom);

	});
}


