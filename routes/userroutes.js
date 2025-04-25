const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');

// Get current user's profile
router.get('/profile', isAuthenticated, userController.getUserProfile);

// Update current user's profile
router.put('/profile', isAuthenticated, userController.updateUserProfile);

// Get current user's borrowed books / transactions
router.get('/borrowed', isAuthenticated, userController.getUserBorrowedBooks);

module.exports = router;



router.post('/change-password', isAuthenticated, userController.changePassword);
router.delete('/account', isAuthenticated, userController.deleteAccount);

