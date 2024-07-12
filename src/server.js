import expressdata from './expressdata.js'; 
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const PORT = 5000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new Database('./databasequeue', { verbose: console.log });

// Ensure channelData table exists
db.prepare(`CREATE TABLE IF NOT EXISTS channelData (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    count NUMBER,
    prefix TEXT
)`).run();

const resetChannelData = () => {
    db.prepare('DELETE FROM channelData').run(); // Delete all records
    const insert = db.prepare('INSERT INTO channelData (name, count, prefix) VALUES (?, ?, ?)');
    initialChannelData.forEach(item => {
        insert.run(item.name, item.count, item.prefix);
    });
};

const count = db.prepare('SELECT COUNT(*) AS count FROM channelData').get().count;
if (count === 0) {
    resetChannelData();
}

const fetchUsersFromDB = () => {
    const stmt = db.prepare('SELECT username, password FROM users');
    return stmt.all();
};

let users = fetchUsersFromDB(); // Sync users array with SQLite database

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, message: 'Login successful!' });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

// Register endpoint
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        res.json({ success: false, message: 'Username already exists' });
    } else {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        try {
            stmt.run(username, password);
            users = fetchUsersFromDB(); // Refresh the users array
            res.json({ success: true, message: 'Registration successful!' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
});

// Health endpoint to check database connection
app.get('/health', (req, res) => {
    try {
        const stmt = db.prepare('SELECT 1');
        stmt.get(); // Executes a simple query to check the connection
        res.json({ success: true, message: 'Database connected successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to connect to the database', error: err.message });
    }
});

// Endpoint to fetch all users
app.get('/users', (req, res) => {
    try {
        const stmt = db.prepare('SELECT id, username FROM users');
        const users = stmt.all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to fetch queue count from expressdata
app.get('/queue', (req, res) => {
    res.json(expressdata.queuecount);
});

app.get('/channel', (req, res) => {
    try {
        const stmt = db.prepare('SELECT id, name, count, prefix FROM channelData');
        const channelData = stmt.all();
        res.json(channelData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/addchannel', (req, res) => {
    const { name, count, prefix } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO channelData (name, count, prefix) VALUES (?, ?, ?)');
        const info = stmt.run(name, count, prefix);
        res.json({ id: info.lastInsertRowid, name, count, prefix });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/channeldelete', (req, res) => {  
    const { id } = req.params;
    try {
        const stmt = db.prepare('DELETE FROM channelData WHERE id = ?');
        stmt.run(id);
        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (err) {
            res.status(500).json({ error: err.message });
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
