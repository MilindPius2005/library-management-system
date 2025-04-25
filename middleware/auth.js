// middleware/auth.js

// Dummy authentication middleware (replace with real auth logic)
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      next();
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  };
  
  // Role-based check: admin only
  exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Admin access only' });
    }
  };
  
  // Role-based check: librarian or admin
  exports.isLibrarianOrAdmin = (req, res, next) => {
    const role = req.session.user?.role;
    if (role === 'librarian' || role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Librarian or Admin access required' });
    }
  };
  