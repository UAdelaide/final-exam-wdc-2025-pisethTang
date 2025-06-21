const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');



const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dog-service-secret-key', // session secret
    resave: false, // don't save session if unmodified
    saveUninitialized: true, // save uninitialized sessions
    cookie: { secure: false } // set to true if using HTTPS
}));



// Importing routes from separate files (more modular)
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);



// Export the app instead of listening here
module.exports = app;
