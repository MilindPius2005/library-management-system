const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { isAuthenticated, isLibrarianOrAdmin } = require('../middleware/auth');

// Get all books
router.get('/', isAuthenticated, bookController.getAllBooks);

// Add a new book (librarian/admin only)
router.post('/', isAuthenticated, isLibrarianOrAdmin, bookController.addBook);

// Update a book's info (librarian/admin only)
router.put('/:bookId', isAuthenticated, isLibrarianOrAdmin, bookController.updateBook);

// Delete a book (librarian/admin only)
router.delete('/:bookId', isAuthenticated, isLibrarianOrAdmin, bookController.deleteBook);

module.exports = router;
