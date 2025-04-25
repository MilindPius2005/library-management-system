const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/users', isAuthenticated, isAdmin, adminController.getAllUsers);

// Update a user's role (admin only)
router.put('/users/role', isAuthenticated, isAdmin, adminController.updateUserRole);

// Delete a user (admin only)
router.delete('/users/:userId', isAuthenticated, isAdmin, adminController.deleteUser);

module.exports = router;





const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);
