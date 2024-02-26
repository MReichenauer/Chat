import { io, Socket } from "socket.io-client";
import {
	ChatMessageData,
	ClientToServerEvents,
	ServerToClientEvents,
	UserJoinResponse
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";



const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;
console.log("SOCKET_HOST:", SOCKET_HOST);

// Forms
const messageEl = document.querySelector("#message") as HTMLInputElement;
const messageFormEl = document.querySelector("#message-form") as HTMLFormElement;
const usernameFormEl = document.querySelector("#username-form") as HTMLFormElement;
const usernameInputEl = document.querySelector("#username") as HTMLInputElement;

// Lists
const messagesEl = document.querySelector("#messages") as HTMLUListElement;

// Views
const chatView = document.querySelector("#chat-wrapper") as HTMLDivElement;
const startView = document.querySelector("#start") as HTMLDivElement;

// Room
const roomEL = document.querySelector("#room") as HTMLSelectElement;


// User Details
let username: string | null = null;

// Connect to Socket.IO Server
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_HOST);

// Add message to the chat
const addMessageToChat = (msg: ChatMessageData, ownMessage = false) => {
	// Create a new LI element
	const msgEl = document.createElement("li");

	// Set class of LI to "message"
	msgEl.classList.add("message");

	// If the message is from the user, add the class "own-message"
	if (ownMessage) {
		msgEl.classList.add("own-message");
	}

	// Get human readable time
	const time = new Date(msg.timestamp).toLocaleTimeString();

	// Set content of the LI element to the message
	msgEl.innerHTML = ownMessage
		? `
            <span class="user">Me</span>
			<span class="content">${msg.content}</span>
			<span class="time">${time}</span>
		` : `
			<span class="user">${msg.username}</span>
			<span class="content">${msg.content}</span>
			<span class="time">${time}</span>
		`;

	// Append the LI element to the messages element
	messagesEl.appendChild(msgEl);
	
	// Scroll to the bottom of messages list
	msgEl.scrollIntoView({ behavior: "smooth"});
}

	// Add notice to the chat
	const addNoticeToChat = (msg: string, timestamp: number) => {
	// Create a new LI element
	const noticeEl = document.createElement("li");

	// Set class of LI to "notice"
	noticeEl.classList.add("notice");

	// Get human readable time
	const time = new Date(timestamp).toLocaleTimeString();

	// Set content of the LI element to the message
	noticeEl.innerHTML = `
			<span class="content">${msg}</span>
			<span class="time">${time}</span>
		`;

	// Append the LI element to the messages element
	messagesEl.appendChild(noticeEl);
	// Scroll to the bottom of messages list
	noticeEl.scrollIntoView({ behavior: "smooth"});
}

// Show chat view
const showChatView = () => {
	startView.classList.add("hide");
	chatView.classList.remove("hide");
}

// Show welcome/"start" view
const showWelcomeView = () => {
	const connectBtnEL = document.querySelector("#connectBtn") as HTMLButtonElement;
	const roomEL = document.querySelector("#room") as HTMLSelectElement;
	
	// Disable connect-button and clear room list
	connectBtnEL.disabled = true;
	roomEL.innerHTML = `<option value="" selected>Loading...</option>`;

	// Request a list of rooms from the server
	console.log("🏨 Requesting rooms");
	socket.emit("getRoomList", (rooms) => {
		console.log(rooms);

	// Update room list
	roomEL.innerHTML = rooms
	.map(room => `<option value="${room.id}">${room.name}</option>`)
	.join("");

	// Enable connect-button
	connectBtnEL.disabled = false;
	});
	// Once we get them, populate the dropdown with rooms

	// After that, enable the connect button

	console.log("Requesting rooms");

	// Hide chat view
	chatView.classList.add("hide");
	// Unhide start view
	startView.classList.remove("hide");
}

// Socket handlers
const handleUserJoinRequestCallback = (response: UserJoinResponse) => {
	console.log("Join was successful?", response);

	if (!response.success || !response.room) {
		alert("NO ACCESS 4 U");
		return;
	}

	// Update chat title with room name
	const chatTitleEl = document.querySelector("#chat-title") as HTMLHeadingElement;
	chatTitleEl.innerText = `Chat room: ${response.room.name}`;

	// Show chat view
	showChatView();    
}

// Listen for when connection is established
socket.on("connect", () => {
	showWelcomeView();
	console.log("💥 Connected to the server", socket.id);
});

// Listen for when server got tired of us
socket.on("disconnect", () => {
	console.log("💀 Disconnected from the server");
});

// Listen for reconnection
socket.io.on("reconnect", () => {
	console.log("Reconnected to the server you old pirate!")
	if (username) {
		const selectedRoomId = roomEL.value;
		if (!selectedRoomId) {
            console.error("No room selected.");
            return;
        }
		// Emit `userJoinRequest` event, but only if we were in chat previously
		socket.emit("userJoinRequest", username, selectedRoomId, handleUserJoinRequestCallback);
		addNoticeToChat("You're reconnected sailor", Date.now());
	}
});

// Listen for when the nice server says hello
socket.on("hello", () => {
	console.log("🤩 Hello! Is it me you're looking for?");
});

// Listen for new chat messages
socket.on("chatMessage", (msg) => {
	console.log("📨 YAY SOMEONE WROTE SOMETHING!!!!!!!", msg);
	addMessageToChat(msg);
});

// Get username from form and then show chat
usernameFormEl.addEventListener("submit", (e) => {
	e.preventDefault();


	// Get username and room
	const trimmedUsername = usernameInputEl.value.trim();
	const selectedRoomId = roomEL.value;
	

	// If no username, no join
	if (!trimmedUsername || !selectedRoomId) {
        return;
    }

	// Set username
	username = trimmedUsername;

	// Emit `userJoinRequest`-event to the server and wait for acknowledgement
	// BEFORE showing the chat view
	socket.emit("userJoinRequest", username, selectedRoomId, handleUserJoinRequestCallback);
        

    // Listen for new user joined
	socket.on("userJoined", (username, timestamp) => {
		console.log("👶🏻 A new user has joined the chat:", username, timestamp);
	
		addNoticeToChat(`${username} has joined the chat`, timestamp);
	});
    
    console.log("Emitted 'userJoinRequest' event to server, username: ", username);  
});

// Send a message to the server when form is submitted
messageFormEl.addEventListener("submit", (e) => {
	e.preventDefault();

	// 💇
	const trimmedMessage = messageEl.value.trim();
	const selectedRoomId = roomEL.value;

	// If no message, no username, no room. No send
	if (!trimmedMessage || !username || !selectedRoomId) {
		return;
	}

	// Construct message payload
	const msg: ChatMessageData = {
		content: trimmedMessage,
		timestamp: Date.now(),
		username,
		roomId: roomEL.value
	}

	// Send (emit) the message to the server
	socket.emit("sendChatMessage", msg);
	console.log("Emitted 'sendChatMessage' event to server", msg);


	addMessageToChat(msg, true);

	// Clear the input field
	messageEl.value = "";
	messageEl.focus();
});
