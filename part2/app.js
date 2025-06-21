const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const db = require('./models/db');



const app = express();

// Session setup
app.use(session({
    secret: 'dog-walking-secret-key', // session secret
    resave: false, 
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;
