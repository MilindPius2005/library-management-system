// controllers/adminController.js
const pool = require('../config/database');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users'
    );
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  const { userId, role } = req.body;
  
  if (!['student', 'faculty', 'librarian', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  try {
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
