// Place this file in: library-management-system/controllers/bookController.js

const pool = require('../config/database');
const { NlpManager } = require('node-nlp');

// Initialize NLP manager
const nlpManager = new NlpManager({ languages: ['en'] });

// This function would be called during app initialization to train the NLP model
async function setupNLP() {
  // Add training data for book searches
  // In a real system, we would load titles and keywords from the database
  nlpManager.addDocument('en', 'find books about programming', 'book.search.category');
  nlpManager.addDocument('en', 'books on artificial intelligence', 'book.search.category');
  nlpManager.addDocument('en', 'show me Python books', 'book.search.category');
  
  nlpManager.addDocument('en', 'books by J.K. Rowling', 'book.search.author');
  nlpManager.addDocument('en', 'find author Stephen King', 'book.search.author');
  
  nlpManager.addDocument('en', 'Harry Potter', 'book.search.title');
  nlpManager.addDocument('en', 'books like Lord of the Rings', 'book.search.title');
  
  // Add entities
  nlpManager.addNamedEntityText('category', 'programming', ['en'], ['programming', 'coding', 'development']);
  nlpManager.addNamedEntityText('category', 'AI', ['en'], ['artificial intelligence', 'AI', 'machine learning', 'ML']);
  
  nlpManager.addNamedEntityText('author', 'Rowling', ['en'], ['J.K. Rowling', 'Rowling', 'JK Rowling']);
  nlpManager.addNamedEntityText('author', 'King', ['en'], ['Stephen King', 'King']);
  
  // Train the model
  await nlpManager.train();
  console.log('NLP Manager trained');
}

// Call this during app initialization
setupNLP();

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    const [books] = await pool.query('SELECT * FROM books ORDER BY title ASC');
    res.status(200).json({ books });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ message: 'Server error fetching books' });
  }
};

// Search books using NLP
exports.searchBooks = async (req, res) => {
  const { query } = req.query;
  
  try {
    // Process the query with NLP
    const nlpResult = await nlpManager.process('en', query);
    console.log('NLP Result:', nlpResult);
    
    let sqlQuery = 'SELECT * FROM books WHERE 1=1';
    const params = [];
    
    // Extract entities and intents from NLP result
    if (nlpResult.intent === 'book.search.category' && nlpResult.entities.length > 0) {
      // Search by category
      const categories = nlpResult.entities
        .filter(entity => entity.entity === 'category')
        .map(entity => entity.option);
      
      if (categories.length > 0) {
        sqlQuery += ' AND (';
        categories.forEach((category, index) => {
          if (index > 0) sqlQuery += ' OR ';
          sqlQuery += 'category LIKE ?';
          params.push(`%${category}%`);
        });
        sqlQuery += ')';
      }
    } else if (nlpResult.intent === 'book.search.author' && nlpResult.entities.length > 0) {
      // Search by author
      const authors = nlpResult.entities
        .filter(entity => entity.entity === 'author')
        .map(entity => entity.option);
      
      if (authors.length > 0) {
        sqlQuery += ' AND (';
        authors.forEach((author, index) => {
          if (index > 0) sqlQuery += ' OR ';
          sqlQuery += 'author LIKE ?';
          params.push(`%${author}%`);
        });
        sqlQuery += ')';
      }
    } else if (nlpResult.intent === 'book.search.title') {
      // Search by title or using fuzzy match
      sqlQuery += ' AND title LIKE ?';
      params.push(`%${query}%`);
    } else {
      // Fallback to standard search if no specific intent is detected
      sqlQuery += ' AND (title LIKE ? OR author LIKE ? OR category LIKE ? OR description LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    // Execute the query
    const [books] = await pool.query(sqlQuery, params);
    
    res.status(200).json({ 
      books,
      query,
      intent: nlpResult.intent,
      entities: nlpResult.entities
    });
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({ message: 'Server error searching books' });
  }
};

// Get book by ID
exports.getBookById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [books] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
    
    if (books.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json({ book: books[0] });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ message: 'Server error fetching book details' });
  }
};

// Add new book (librarian/admin only)
exports.addBook = async (req, res) => {
  const { 
    title, author, isbn, category, publication_year, 
    publisher, copies_available, total_copies, description, location 
  } = req.body;
  
  try {
    // Check if book already exists
    const [existingBooks] = await pool.query('SELECT * FROM books WHERE isbn = ?', [isbn]);
    
    if (existingBooks.length > 0) {
      return res.status(400).json({ message: 'Book with this ISBN already exists' });
    }
    
    // Add new book
    const [result] = await pool.query(
      `INSERT INTO books (
        title, author, isbn, category, publication_year, 
        publisher, copies_available, total_copies, description, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, author, isbn, category, publication_year, 
        publisher, copies_available, total_copies, description, location
      ]
    );
    
    res.status(201).json({ 
      message: 'Book added successfully',
      bookId: result.insertId
    });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error adding book' });
  }
};

// Update book (librarian/admin only)
exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const { 
    title, author, category, publication_year, 
    publisher, copies_available, total_copies, description, location 
  } = req.body;
  
  try {
    const [result] = await pool.query(
      `UPDATE books SET 
        title = ?, author = ?, category = ?, publication_year = ?, 
        publisher = ?, copies_available = ?, total_copies = ?, description = ?, location = ? 
      WHERE id = ?`,
      [
        title, author, category, publication_year, 
        publisher, copies_available, total_copies, description, location, id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json({ message: 'Book updated successfully' });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ message: 'Server error updating book' });
  }
};

// Delete book (admin only)
exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if book is currently borrowed
    const [transactions] = await pool.query(
      'SELECT * FROM transactions WHERE book_id = ? AND status = "borrowed"',
      [id]
    );
    
    if (transactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete book as it is currently borrowed by users'
      });
    }
    
    // Delete book
    const [result] = await pool.query('DELETE FROM books WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ message: 'Server error deleting book' });
  }
};