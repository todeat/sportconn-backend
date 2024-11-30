// middleware/authMiddleware.js
const admin = require('../config/firebase');

async function verifyToken(req, res, next) {
  const idToken = req.body.token || req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; 
    req.token = idToken;
    next(); 
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ message: 'Invalid token', error });
  }
}

module.exports = verifyToken;
