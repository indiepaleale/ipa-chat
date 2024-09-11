import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';

const app = express();
const server = createServer(app);
const io = new Server(server);

// Open SQLite database
const db = new Database('./chat.db');

// Create table if it doesn't exist
db.exec('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, text TEXT, createdAt TEXT)');

// Check for command-line argument to clear the database
if (process.argv.includes('--clear-database')) {
    db.exec('DELETE FROM messages');
    console.log('Database cleared, starting fresh');
    // process.exit(0); // Exit the process after clearing the database
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send message history to the newly connected user
    const messages = db.prepare('SELECT * FROM messages ORDER BY createdAt ASC').all();
    socket.emit('messageHistory', messages);

    // Listen for incoming messages
    socket.on('chatMessage', (msg) => {
        const message = { text: msg, createdAt: new Date().toISOString() };
        db.prepare('INSERT INTO messages (text, createdAt) VALUES (?, ?)').run(message.text, message.createdAt);

        // Broadcast the message to all users
        io.emit('chatMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});