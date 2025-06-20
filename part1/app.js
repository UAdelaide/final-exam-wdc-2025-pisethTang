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


app.use('/', indexRouter);
app.use('/users', usersRouter);




// Following app.js inside the /starthere directory,
// we will create a MySQL connection and set up the database.
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

      // Insert Five Walk Requests (using subqueries for
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

      // Insert WalkRatings
      await db.execute(`
      INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
      -- Bob's ratings
      ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')) AND requested_time = '2025-06-10 09:30:00'), (SELECT user_id FROM Users WHERE username = 'bobwalker'), (SELECT user_id FROM Users WHERE username = 'carol123'), 5, 'Bob was fantastic with Bella!'),
      ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Fido' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')) AND requested_time = '2025-06-13 16:00:00'), (SELECT user_id FROM Users WHERE username = 'bobwalker'), (SELECT user_id FROM Users WHERE username = 'carol123'), 4, 'Fido had a great walk, no issues.'),
      -- David's rating
      ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Sparky' AND owner_id = (SELECT user_id FROM Users WHERE username = 'emilyowner')) AND requested_time = '2025-06-12 10:00:00'), (SELECT user_id FROM Users WHERE username = 'davidthewalker'), (SELECT user_id FROM Users WHERE username = 'emilyowner'), 3, 'Sparky was fine with David, but a bit late.'),
      -- Sarah's rating (for Daisy's walk)
      ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Daisy' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')) AND requested_time = '2025-06-11 14:00:00'), (SELECT user_id FROM Users WHERE username = 'sarahwalker'), (SELECT user_id FROM Users WHERE username = 'alice123'), 5, 'Sarah was amazing with Daisy! ');
    `);
      console.log('Walk Ratings inserted.');
      console.log('-----------------------------------------------');
    }

  } catch (err) {
      console.error('Error setting up database. Ensure MySQL is running and accessible.', err);
    // Exit the process if database setup fails critically
    // process.exit(1);
  }
})();


// Route to return a list of all dogs with their size and owner's username
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
      SELECT
        d.name AS dog_name,
        d.size,
        u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id;
    `);
    res.json(dogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs data' });
  }
});

// Route to return all open walk requests,
// including the dog name, requested time, location, and owner's username
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [openRequests] = await db.execute(`
      SELECT
        wr.request_id,
        d.name AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open';
    `);

    // Format requested_time to match sample "2025-06-10T08:00:00.000Z"
    const formattedRequests = openRequests.map((request) => ({
      ...request,
      requested_time: request.requested_time ? new Date(request.requested_time).toISOString() : null
    }));

    res.json(formattedRequests);
  } catch (err) {
    // console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests data' });
  }
});






// Route to return a summary of each walker with their average rating and number of completed walks
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkerSummary] = await db.execute(`
      SELECT
          u.username AS walker_username,
          COALESCE(r.total_ratings, 0) AS total_ratings,
          COALESCE(r.average_rating, NULL) AS average_rating,
          COALESCE(c.completed_walks, 0) AS completed_walks
      FROM Users u
      LEFT JOIN (
          SELECT
              wr.walker_id,
              COUNT(wr.rating_id) AS total_ratings,
              AVG(wr.rating) AS average_rating
          FROM WalkRatings wr
          GROUP BY wr.walker_id
      ) r ON u.user_id = r.walker_id
      LEFT JOIN (
          SELECT
              wa.walker_id,
              COUNT(DISTINCT war.request_id) AS completed_walks
          FROM WalkApplications wa
          JOIN WalkRequests war ON wa.request_id = war.request_id
          WHERE wa.status = 'accepted' AND war.status = 'completed'
          GROUP BY wa.walker_id
      ) c ON u.user_id = c.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username -- Grouping by user_id is sufficient due to unique username
      ORDER BY u.username;
    `);

    // Adjust NULL for average_rating if total_ratings is 0, to match sample output
    const formattedSummary = walkerSummary.map((walker) => ({
      ...walker,
      average_rating: walker.total_ratings === 0 ? null : parseFloat(walker.average_rating)
    }));

    res.json(formattedSummary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walkers summary data' });
  }
});


app.use(express.static(path.join(__dirname, 'public')));



//  ----------------------- Error handling logic by the Node.js application -------------------
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
