const admin = require('../Services/firebaseAdmin');
const AppErr = require('../Services/AppErr'); 

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppErr('Unauthorized - No token', 401));
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // contains uid, email, etc.
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return next(new AppErr('Invalid or expired token', 403));
  }
};

module.exports = verifyToken;
