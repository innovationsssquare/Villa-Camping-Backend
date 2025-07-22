const { OAuth2Client } = require('google-auth-library');

// Replace this with your Web Client ID from Google Console (not iOS/Android ID)
const CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

const verifyGoogleToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    req.user = payload; // payload contains email, sub (user id), name, picture, etc.

    next();
  } catch (err) {
    console.error('Google token verification failed:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyGoogleToken;
