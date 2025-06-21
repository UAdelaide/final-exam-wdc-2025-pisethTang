const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const {
    username, email, password, role
  } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login (dummy version)
router.post('/login', async (req, res) => {
    const { username, password } = req.body; // Expecting username and plain password from frontend

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // 1. Fetch user by username ONLY
        const [users] = await db.execute(
            'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
            [username]
        );

        const user = users[0]; // Get the first user found (if any)

        // 2. Check if user exists AND if the
        // provided plain 'password' matches the stored 'password_hash'
        // This is the direct string comparison you require.
        if (!user || user.password_hash !== password) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // --- Login Successful ---
        // Store necessary user info in the session
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            role: user.role
        };

        // Send back success message and role for client-side redirection
        res.status(200).json({
          success: true,
          message: 'Login successful!',
          role: user.role,
          userId: user.user_id
        });


    } catch (error) {
        // console.error('Database error during login (POST /login):', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});


// POST logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err){
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }


    // Session destroyed, cookie cleared by express-session (if no error)
    // Redirecting on client-side
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
