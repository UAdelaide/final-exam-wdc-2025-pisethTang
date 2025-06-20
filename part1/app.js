var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);




// Following app.js inside the /starthere directory, we will create a MySQL connection and set up the database.
let db;


/**
 * Initializes the MySQL database connection and populates the schema and data.
 * This function will be called once when the application starts.
 */
(async () => {
  try {
    // 1. Connect to MySQL without specifying a database to perform DDL operations
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // IMPORTANT: Set your MySQL root password here
      multipleStatements: true // Allows execution of multiple SQL statements
                                // in one query (for dogwalks.sql)
    });

    // 2. Read the dogwalks.sql file
    const fs = require('fs').promises; // Use promises version of fs for async/await
    const sqlSchema = await fs.readFile(path.join(__dirname, 'dogwalks.sql'), 'utf8');

    // 3. Execute the schema to create/recreate the database and tables
    // This will DROP, CREATE DATABASE, USE, and CREATE TABLE statements
    await connection.query(sqlSchema);
    console.log('Database schema from dogwalks.sql applied successfully.');

    // 4. Now connect specifically to the DogWalkService database
    await connection.end(); // Close the initial connection
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // IMPORTANT: Set your MySQL root password here
      database: 'DogWalkService' // Connect to the newly created/used database
    });
    console.log('Connected to DogWalkService database.');

    // 5. Check if Users table is empty before inserting data
    const [userRows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (userRows[0].count === 0) {
      console.log('Populating DogWalkService with initial data...');

      // Insert Five Users
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('davidthewalker', 'david@example.com', 'hashedabc', 'walker'),
        ('emilyowner', 'emily@example.com', 'hasheddef', 'owner');
      `);
      console.log('Users inserted.');

      // Insert Five Dogs (using subqueries for owner_id)
      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Daisy', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'emilyowner'), 'Sparky', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Fido', 'medium');
      `);
      console.log('Dogs inserted.');

      // -- Insert Five Walk Requests (using subqueries for
      //  dog_id and owner_id to find the right dog)
      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Daisy' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), '2025-06-11 14:00:00', 60, 'City Gardens', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Sparky' AND owner_id = (SELECT user_id FROM Users WHERE username = 'emilyowner')), '2025-06-12 10:00:00', 30, 'Suburb Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Fido' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), '2025-06-13 16:00:00', 45, 'Riverwalk Path', 'completed');
      `);
      console.log('Walk Requests inserted.');
    } else {
      console.log('Database already populated. Skipping initial data insertion.');
    }

  } catch (err) {
    console.error('Error setting up database. Ensure MySQL is running and accessible.', err);
    // Exit the process if database setup fails critically
    // process.exit(1);
  }
})();















//  Error handling logic by the Node.js application
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
