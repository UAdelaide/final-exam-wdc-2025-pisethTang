const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const db = require('./models/db');



const app = express();

// Session setup
app.use(session({
    secret: 'dog-service-secret-key', // session secret
    resave: false, // don't save session if unmodified
    saveUninitialized: true, // save uninitialized sessions
    cookie: { secure: false } // set to true if using HTTPS
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));











// Importing routes from separate files (more modular)
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);



// Route to return a list of all dogs with their size and owner
app.get('/api/dogs', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.dog_id, d.name, d.size, u.username AS owner_name
            FROM Dogs d
            JOIN Users u ON d.owner_id = u.user_id
        `);
        res.json(rows);
    } catch (error) {
        console.error('SQL Error:', error);
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});










// Export the app instead of listening here
module.exports = app;
