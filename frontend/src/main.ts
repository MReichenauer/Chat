import { io, Socket } from "socket.io-client";
import {
	ChatMessageData,
	ClientToServerEvents,
	ServerToClientEvents,
	UserJoinResponse
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";
import { User } from "@shared/types/Models";



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

// Add multiple messages to the chat
const addMessagesToChat = (msgs: ChatMessageData[]) => {

	// Clear any previous messages from the chat
	messagesEl.innerHTML= "";

	addNoticeToChat("You're connected sailor", Date.now());

	// Loop over messages and add them to the chat
	msgs.forEach(msg => {
		addMessageToChat(msg);
	});
}


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

// update online users list
const updateOnlineUsers = (users: User[]) => {
	const onlineUsersEl = document.querySelector("#online-users") as HTMLUListElement;

	onlineUsersEl.innerHTML = users
		.map(user =>
			user.id === socket.id
				? `<li class="me"><span>&#x1f9B8;</span> ${user.username}</li>`
				: `<li><span>&#x1f47d;</span> ${user.username}</li>`
		)
		.join("");
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
	socket.emit("getRoomList", (rooms) => {
		
	// Update room list
	roomEL.innerHTML = rooms
	.map(room => `<option value="${room.id}">${room.name}</option>`)
	.join("");

	// Enable connect-button
	connectBtnEL.disabled = false;
	});
	
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

	// Add messages to chat
	console.log("Messages history", response.room.messages);
	addMessagesToChat(response.room.messages);

	// Update userlist with users in the room
	updateOnlineUsers(response.room.users);

	// Show chat view
	showChatView();    
}

// Listen for when connection is established
socket.on("connect", () => {
	showWelcomeView();
});

// Listen for when server got tired of us
socket.on("disconnect", () => {
});

// Listen for reconnection
socket.io.on("reconnect", () => {
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

// Listen for when the server says hello
socket.on("hello", () => {
	console.log("Looking for me?");
});

// Listen for new chat messages
socket.on("chatMessage", (msg) => {
	addMessageToChat(msg);
});

// listen for a updated list of online users
socket.on("onlineUsers", (users) => {
	updateOnlineUsers(users);
})

   // Listen for user left
   socket.on("userLeft", (username, timestamp) => {
	addNoticeToChat(`${username} has left the chat`, timestamp);
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
	socket.emit("userJoinRequest", username, selectedRoomId, handleUserJoinRequestCallback);

    // Listen for new user joined
	socket.on("userJoined", (username, timestamp) => {
	
		addNoticeToChat(`${username} has joined the chat`, timestamp);
	}); 
});

// Send a message to the server when form is submitted
messageFormEl.addEventListener("submit", (e) => {
	e.preventDefault();

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
	
	addMessageToChat(msg, true);

	// Clear the input field
	messageEl.value = "";
	messageEl.focus();
});
