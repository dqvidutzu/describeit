const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {}; // Store room data

io.on('connection', (socket) => {
    console.log('user connected:', socket.id);

    // Create Room
    socket.on('createRoom', ({ maxPlayers, impostorCount }) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate room code
        rooms[roomCode] = {
            host: socket.id,
            players: [socket.id],
            maxPlayers,
            impostorCount,
        };
        socket.join(roomCode); // Join the room
        console.log(`room created: ${roomCode}, max players: ${maxPlayers}, impostors: ${impostorCount}`);
        socket.emit('roomCreated', { code: roomCode, hostId: socket.id }); // Notify the creator
    });

    // Join Room
    socket.on('joinRoom', (roomCode) => {
        const normalizedRoomCode = roomCode.toUpperCase(); // Convert room code to uppercase
        const room = rooms[normalizedRoomCode];
        if (room) {
            if (room.players.length >= room.maxPlayers) {
                return socket.emit('error', 'room is full'); // Notify if room is full
            }
            room.players.push(socket.id);
            socket.join(normalizedRoomCode); // Join the room
            console.log(`user ${socket.id} joined room: ${normalizedRoomCode}`);
            io.to(normalizedRoomCode).emit('updatePlayers', { players: room.players, hostId: room.host }); // Notify all players
            socket.emit('waitingForHost'); // Notify the joining player
        } else {
            socket.emit('error', 'room does not exist'); // Notify if room doesn't exist
        }
    });

    // Start Game
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error', 'room not found');
        if (socket.id !== room.host) return socket.emit('error', 'you are not host');

        const words = [
            "pirate", "dragon", "robot", "mermaid", "astronaut", "wizard", "vampire", "zombie", "superhero", "ninja",
            "unicorn", "alien", "detective", "witch", "monster", "giant", "ghost", "fairy", "knight", "troll",
        ];
        const chosenWord = words[Math.floor(Math.random() * words.length)];
        const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
        const impostors = shuffledPlayers.slice(0, room.impostorCount);

        shuffledPlayers.forEach((id) => {
            const role = impostors.includes(id) ? 'IMPOSTOR' : chosenWord;
            io.to(id).emit('yourWord', role);
        });

        delete rooms[roomCode]; // Optionally close the room after one game
        console.log(`game started in room ${roomCode}. words given`);
    });

    // Kick Player
    socket.on('kickPlayer', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (!room) return socket.emit('error', 'room not found');
        if (socket.id !== room.host) return socket.emit('error', 'must be host');

        room.players = room.players.filter((id) => id !== playerId);
        io.to(playerId).emit('kicked'); // Notify kicked player
        io.to(roomCode).emit('updatePlayers', { players: room.players, hostId: room.host }); // Update remaining players
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        for (const [roomCode, room] of Object.entries(rooms)) {
            room.players = room.players.filter((id) => id !== socket.id);
            if (room.players.length === 0) delete rooms[roomCode]; // Delete room if empty
        }
    });
});

server.listen(3000, () => {
    console.log('server running on http://localhost:3000');
});
