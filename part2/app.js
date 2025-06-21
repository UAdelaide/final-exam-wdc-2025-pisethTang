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




function requireRole(role){
    return function(req, res, next) {
        if (!req.session.user || req.session.user.role !== role) {
            return res.redirect('/');
        }
        next();
    };
}


app.get('/walker-dashboard.html', requireRole('walker'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'walker-dashboard.html'));
});

app.get('/owner-dashboard.html', requireRole('owner'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'owner-dashboard.html'));
});










// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);














// Export the app instead of listening here
module.exports = app;
