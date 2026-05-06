const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'farmhouse-jwt-secret-change-in-production');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const admin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

const superAdmin = (req, res, next) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmin role required.' });
  }
  next();
};

module.exports = { auth, admin, superAdmin };
