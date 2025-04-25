// Place this file in: library-management-system/controllers/transactionController.js

const pool = require('../config/database');
const { sendEmail } = require('../utils/notifications');

// Borrow a book
exports.borrowBook = async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user.id;
  
  try {
    // Check if book exists and is available
    const [books] = await pool.query(
      'SELECT * FROM books WHERE id = ? AND copies_available > 0',
      [bookId]
    );
    
    if (books.length === 0) {
      return res.status(400).json({ 
        message: 'Book not available for borrowing'
      });
    }
    
    // Check if user already has 5 books borrowed (limit)
    const [userTransactions] = await pool.query(
      'SELECT COUNT(*) as borrowedCount FROM transactions WHERE user_id = ? AND status = "borrowed"',
      [userId]
    );
    
    if (userTransactions[0].borrowedCount >= 5) {
      return res.status(400).json({ 
        message: 'Cannot borrow more than 5 books at a time'
      });
    }
    
    // Check if user already has this book
    const [existingTransaction] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? AND book_id = ? AND status = "borrowed"',
      [userId, bookId]
    );
    
    if (existingTransaction.length > 0) {
      return res.status(400).json({ 
        message: 'You have already borrowed this book'
      });
    }
    
    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    
    // Begin transaction
    await pool.query('START TRANSACTION');
    
    try {
      // Create transaction record
      await pool.query(
        'INSERT INTO transactions (user_id, book_id, due_date, status) VALUES (?, ?, ?, "borrowed")',
        [userId, bookId, dueDate]
      );
      
      // Update book availability
      await pool.query(
        'UPDATE books SET copies_available = copies_available - 1 WHERE id = ?',
        [bookId]
      );
      
      // Create notification for due date reminder
      await pool.query(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, "due_date")',
        [userId, `Your book "${books[0].title}" is due on ${dueDate.toDateString()}`]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Send email notification
      const [users] = await pool.query('SELECT email, name FROM users WHERE id = ?', [userId]);
      if (users.length > 0) {
        try {
          await sendEmail(
            users[0].email,
            'Book Borrowed Successfully',
            `Dear ${users[0].name},\n\nYou have borrowed "${books[0].title}" by ${books[0].author}. Due date: ${dueDate.toDateString()}\n\nRegards,\nLibrary Management System`
          );
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          // Don't fail the transaction if email fails
        }
      }
      
      res.status(200).json({
        message: 'Book borrowed successfully',
        dueDate: dueDate.toISOString()
      });
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Borrow book error:', error);
    res.status(500).json({ message: 'Server error processing book borrow request' });
  }
};

// Return a book
exports.returnBook = async (req, res) => {
  const { transactionId } = req.body;
  const userId = req.user.id;
  
  try {
    // Get transaction details
    const [transactions] = await pool.query(
      'SELECT t.*, b.title FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.id = ? AND t.user_id = ? AND t.status = "borrowed"',
      [transactionId, userId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    const transaction = transactions[0];
    const returnDate = new Date();
    let fine = 0;
    
    // Calculate fine if returned late
    const dueDate = new Date(transaction.due_date);
    if (returnDate > dueDate) {
      const daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * 2; // $2 per day late
    }
    
    // Begin transaction
    await pool.query('START TRANSACTION');
    
    try {
      // Update transaction record
      await pool.query(
        'UPDATE transactions SET return_date = ?, fine = ?, status = "returned" WHERE id = ?',
        [returnDate, fine, transactionId]
      );
      
      // Update book availability
      await pool.query(
        'UPDATE books SET copies_available = copies_available + 1 WHERE id = ?',
        [transaction.book_id]
      );
      
      // Create notification
      await pool.query(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, "system")',
        [userId, `You have returned "${transaction.title}". Fine: $${fine}`]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
      res.status(200).json({
        message: 'Book returned successfully',
        fine: fine,
        returnDate: returnDate.toISOString()
      });
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({ message: 'Server error processing book return' });
  }
};

// Get user's borrowed books
exports.getUserBorrowings = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [transactions] = await pool.query(
      `SELECT t.id, t.issue_date, t.due_date, t.status, t.fine,
       b.id as bookId, b.title, b.author, b.isbn, b.category
       FROM transactions t
       JOIN books b ON t.book_id = b.id
       WHERE t.user_id = ? AND t.status IN ("borrowed", "overdue")
       ORDER BY t.due_date ASC`,
      [userId]
    );
    
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get borrowings error:', error);
    res.status(500).json({ message: 'Server error fetching borrowed books' });
  }
};

// Get user's borrowing history
exports.getUserHistory = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [transactions] = await pool.query(
      `SELECT t.id, t.issue_date, t.due_date, t.return_date, t.status, t.fine,
       b.id as bookId, b.title, b.author, b.isbn, b.category
       FROM transactions t
       JOIN books b ON t.book_id = b.id
       WHERE t.user_id = ?
       ORDER BY t.issue_date DESC`,
      [userId]
    );
    
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error fetching borrowing history' });
  }
};

// Check for overdue books and update status (to be run by a scheduler)
exports.checkOverdueBooks = async () => {
  try {
    const today = new Date();
    
    // Find transactions that are overdue but not marked as overdue
    const [overdueTransactions] = await pool.query(
      `SELECT t.id, t.user_id, t.due_date, 
       u.email, u.name,
       b.title, b.author
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       JOIN books b ON t.book_id = b.id
       WHERE t.status = "borrowed" AND t.due_date < ?`,
      [today]
    );
    
    // Update each overdue transaction
    for (const transaction of overdueTransactions) {
      // Mark as overdue
      await pool.query(
        'UPDATE transactions SET status = "overdue" WHERE id = ?',
        [transaction.id]
      );
      
      // Create notification
      await pool.query(
        'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, "overdue")',
        [transaction.user_id, `Your book "${transaction.title}" is overdue. Please return it as soon as possible.`]
      );
      
      // Send email
      try {
        await sendEmail(
          transaction.email,
          'Book Overdue Notification',
          `Dear ${transaction.name},\n\nYour book "${transaction.title}" by ${transaction.author} was due on ${new Date(transaction.due_date).toDateString()}. Please return it as soon as possible to avoid additional fines.\n\nRegards,\nLibrary Management System`
        );
      } catch (emailError) {
        console.error('Overdue email notification error:', emailError);
      }
    }
    
    console.log(`${overdueTransactions.length} overdue transactions processed`);
    return overdueTransactions.length;
  } catch (error) {
    console.error('Check overdue books error:', error);
    throw error;
  }
};