const socket = io();

// Elements
const lobbyDiv = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playersList = document.getElementById("playersList");
const yourWordP = document.getElementById("yourWord");

let currentRoomCode = "";
let currentHostId = "";

// --- CREATE ROOM ---
document.getElementById("createBtn").onclick = () => {
    const maxPlayers = parseInt(document.getElementById("maxPlayers").value);
    const impostorCount = parseInt(document.getElementById("impostorCount").value);

    if (isNaN(maxPlayers) || isNaN(impostorCount) || maxPlayers < 2 || impostorCount < 1) {
        alert("enter a valid number");
        return;
    }

    socket.emit("createRoom", { maxPlayers, impostorCount });
};

// --- JOIN ROOM ---
document.getElementById("joinBtn").onclick = () => {
    const code = document.getElementById("joinCode").value.trim();
    if (!code) return alert("enter a room code");
    socket.emit("joinRoom", code);
};

// --- START GAME ---
document.getElementById("startBtn").onclick = () => {
    if (!currentRoomCode) return;
    socket.emit("startGame", currentRoomCode);
};

// --- SOCKET.IO EVENTS ---

// Room successfully created
socket.on("roomCreated", ({ code, hostId }) => {
    currentRoomCode = code;
    currentHostId = hostId;
    lobbyDiv.style.display = "none";
    gameDiv.style.display = "block";
    roomCodeDisplay.innerText = code;
});

// Room updated with new player list
socket.on("updatePlayers", ({ players, hostId }) => {
    currentHostId = hostId;
    playersList.innerHTML = "";
    players.forEach((id, idx) => {
        const li = document.createElement("li");
        li.innerText = `player${idx + 1}`;

        // Add kick button if current user is host and not the player themselves
        if (socket.id === currentHostId && socket.id !== id) {
            const kickBtn = document.createElement("button");
            kickBtn.innerText = "kick";
            kickBtn.style.marginLeft = "10px";
            kickBtn.onclick = () => {
                socket.emit("kickPlayer", { roomCode: currentRoomCode, playerId: id });
            };
            li.appendChild(kickBtn);
        }

        playersList.appendChild(li);
    });

    // Show "Start Game" button only for the host
    const startBtn = document.getElementById("startBtn");
    if (socket.id === currentHostId) {
        startBtn.style.display = "block";
    } else {
        startBtn.style.display = "none";
    }
});

// Receive assigned word or impostor
socket.on("yourWord", (word) => {
    roomCodeDisplay.style.display = "none";
    playersList.style.display = "none";
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("tohide").style.display = "none";

    if (word === "IMPOSTOR") {
        yourWordP.innerHTML = `<span style="color:red; font-weight:bold;">you are the impostor</span>`;
    } else {
        yourWordP.innerText = `your word: ${word}`;
    }
    yourWordP.style.animation = "fade 3s ease";
    yourWordP.style.animation = "typing 3s steps(30, end), blink 0.9s step-end infinite";
});

// Notify kicked player
socket.on("kicked", () => {
    alert("you got your ass kicked!");
    location.reload();
});

// Errors from server
socket.on("error", (msg) => {
    alert(msg);
});

// Waiting for host
socket.on("waitingForHost", () => {
    lobbyDiv.style.display = "none";
    gameDiv.style.display = "block";
    roomCodeDisplay.innerText = currentRoomCode;
    playersList.innerHTML = "<li>waiting for host...</li>";
    document.getElementById("tohide").style.display = "none";
});
