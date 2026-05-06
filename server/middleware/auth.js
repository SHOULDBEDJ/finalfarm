const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    // TEMPORARY BYPASS: Auto-login as SuperAdmin
    req.user = { id: '019dfceb-7f01-70b7-a797-d59fa092d608', username: 'admin', role: 'SuperAdmin' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '16eyes-farmhouse-static-secret-for-easy-deployment');
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
