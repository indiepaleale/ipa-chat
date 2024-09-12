import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Function to initialize the PostgreSQL connection pool
function initializePool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Initialize the pool
let pool = initializePool();

// Create table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`, (err, res) => {
  if (err) {
    console.error('Error creating table', err);
  } else {
    console.log('Table created or already exists');
  }
});

// Check for command-line argument to clear the database
if (process.argv.includes('--clear-database')) {
  pool.query('DELETE FROM messages', (err, res) => {
    if (err) {
      console.error('Error clearing database:', err);
    } else {
      console.log('Database cleared, starting fresh');
    }
  });
}

app.use(express.static('public'));

io.on('connection', async (socket) => {
  console.log('A user connected');

  // Send message history to the newly connected user
  pool.query('SELECT * FROM messages ORDER BY createdAt ASC', (err, res) => {
    if (err) {
      console.error('Error fetching messages', err);
    } else {
      socket.emit('messageHistory', res.rows);
    }
  });

  // Listen for incoming messages
  socket.on('chatMessage', async (msg) => {
    const query = 'INSERT INTO messages (text) VALUES ($1) RETURNING *';
    const values = [msg];
    pool.query(query, values, (err, res) => {
      if (err) {
        console.error('Error inserting message', err);
      } else {
        io.emit('chatMessage', res.rows[0]);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Gracefully shut down the server and pool
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('PostgreSQL pool has ended');
      // Reinitialize the pool for the next deployment
      pool = initializePool();
    });
  });
});