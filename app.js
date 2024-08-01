const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'mysql-zavier.alwaysdata.net',
    user: 'zavier',
    password: 'Oreomcflurry1',
    database: 'zavier_rp'
});

connection.connect(error => {
    if (error) {
        console.error('Error connecting to database', error.message);
        return res.status(500).send('Error connecting to database');
    }
    else {
        console.log('Connected to MySql database')
    }
});

//set view engine
app.set('view engine','ejs')

//set express static
app.use(express.static('public'));

app.use(express.urlencoded({
    extended: false
}));

app.use(express.static('public'));

//display book on homepage
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM books';
    connection.query(sql, (error, result) => {
        if (error) {
            console.error('Error retrieving data from user', error);
            return res.status(500).send('Error retrieving data from user');
        } else {
            res.render('index', { books: result });
        }
    });
});

// Route to fetch all books
app.get('/browse', (req, res) => {
    const sql = 'SELECT * FROM books';
    connection.query(sql, (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Error executing query')
      }
      res.render('browse', { books: result }); 
    });
  });

//about us page
app.get('/about',(req,res) => {
    res.render('about')
});

//Browse page
app.get('/browse', (req,res) => {
    const sql = 'SELECT * FROM books'
    connection.query(sql, (error,result) => {
        if (error) {
            console.error('Error retrieving books data', error)
            return res.status(500).send('Error retrieving books data')
        }
        else {
            res.render('browse', {books: result})
        }
    });
});

// Route to display book details by id
app.get('/book-details/:bookId', (req, res) => {
    const bookId = req.params.bookId;
    const sql = 'SELECT * FROM books WHERE bookId=?';
    connection.query(sql, [bookId], (error, result) => {
        if (error) {
            console.error('Error retrieving book details:', error);
            res.status(500).send('Error retrieving book details');
        }
        if (result.length === 0) {
            res.status(404).send('Book not found');
            return;
        }
        else {
        res.render('book-details', { book: result[0] })
        }
    });
});

//login page
app.get('/login', (req,res) => {
    const sql = 'SELECT * FROM users'
    connection.query(sql, (error,result) => {
        if (error) {
            console.error('Error retriving login details',error)
            return res.status(500).send('Error retrieving login details')
        }
        else {
            res.render('login');
        }
    });
});

app.post('/login/', (req,res) => {
    const {username,password} = req.body;
    const sql = 'SELECT * from users WHERE username=? AND password=?'
    console.log(req.body)
    connection.query(sql,[username,password], (error,result) => {
        if(error) {
            console.error("Invalid login details");
            return res.status(500).send("invalid login details");
        }
        console.log('Query results:', result)
        if (result.length > 0) {
            const user = result[0];
            const userId = user.userId; 
            res.redirect(`/mybooks/${userId}`);
        } else {
            res.send("Invalid username or password. Please try again");
        }
    });
});

// Route to serve register form 
app.get('/register', (req, res) => {
    res.render('register'); 
  });

app.post('/register', (req,res) => {
    const {email,username,password} = req.body
    const sql = 'INSERT INTO users (email,username,password) VALUES (?,?,?)';
    connection.query(sql, [email,username,password], (error,result) => {
        if(error) {
            console.error('Error adding new user')
            res.status(500).send('Error adding new user')
        }
        else {
            res.redirect('login')
        }
    });
});
  
 // Route to handle search requests
app.get('/search', (req, res) => {
    const searchTerm = req.query.query;
  
    // Query to search books in database
    const sql = 'SELECT * FROM books WHERE title LIKE ? OR sumamry like ?';
    const searchQuery = `%${searchTerm}%`;
    connection.query(sql, [searchQuery], (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Database error. Please try again later');
      }
      res.render('searchResult', {result});
    });
  });

//mybooks redirect
app.get('/mybooks', (req,res) => {
    res.render('mybooks-redirect')
});

//display books by USER ID
app.get('/mybooks/:userId', (req, res) => {
    const userId = req.params.userId;
    console.log(req.params.userId)
    const sql = `
      SELECT b.title, b.author, r.reservationDate, r.status
      FROM reservation r
      JOIN books b ON r.bookId = b.bookId
      WHERE r.userId =?
    `;
    connection.query(sql, [userId], (error, result) => {
      if (error) {
        console.error('Error retrieving user data', error);
        res.status(500).send('Error retrieving user data');
      }
      else {
      res.render('mybooks', { books: result });
      }
    });
});

//route borrow-book page
app.get('/borrow-book', (req,res) => {
    res.render('borrow-book')
});

// Route to handle borrowing a book
app.post('/borrow-book', (req, res) => {
    const { userId, bookId } = req.body;
    const reservationDate = new Date(); 
    const status = 'borrowed';

    // Check if the book is available
    const checkAvailabilityQuery = 'SELECT available FROM books WHERE bookId = ?';
    connection.query(checkAvailabilityQuery, [bookId], (error, results) => {
        if (error) {
            console.error('Error checking book availability:', error);
            res.status(500).send('Error checking book availability');
            return;
        }

        if (results.length === 0 || results[0].available === 0) {
            res.status(400).send('Book not available for borrowing');
            return;
        }

        // Insert into reservation table
        const insertReservationQuery = 'INSERT INTO reservation (userId, bookId, reservationDate, status) VALUES (?, ?, ?, ?)';
        connection.query(insertReservationQuery, [userId, bookId, reservationDate, status], (error, result) => {
            if (error) {
                console.error('Error inserting reservation:', error);
                res.status(500).send('Error borrowing book');
                return;
            }

            // Update book availability
            const updateAvailabilityQuery = 'UPDATE books SET available = 0 WHERE bookId = ?';
            connection.query(updateAvailabilityQuery, [bookId], (error) => {
                if (error) {
                    console.error('Error updating book availability:', error);
                    res.status(500).send('Error updating book availability');
                    return;
                }

                res.send('Book borrowed successfully');
            });
        });
    });
});        

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ${PORT}'));