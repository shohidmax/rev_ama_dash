const jwt = require('jsonwebtoken');
const axios = require('axios');

let googlePublicKeys = {};
let keysLastFetched = 0;

const getGooglePublicKeys = async () => {
  const now = Date.now();
  if (Object.keys(googlePublicKeys).length === 0 || now - keysLastFetched > 6 * 60 * 60 * 1000) {
    const res = await axios.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    googlePublicKeys = res.data;
    keysLastFetched = now;
  }
  return googlePublicKeys;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // 1. Try validating as Admin JWT (signed with local JWT_SECRET)
      try {
        const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET || 'amaira_secret_key_123');
        req.adminId = decodedAdmin.id;
        req.adminEmail = 'admin@amairafruits.com';
        return next();
      } catch (err) {
        // Not a local admin token, fallback to Firebase validation
      }

      // 2. Try validating as Firebase User ID Token
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      const kid = decodedHeader.header.kid;
      const publicKeys = await getGooglePublicKeys();
      const publicKeyPem = publicKeys[kid];
      if (!publicKeyPem) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || 'amaira-fruits';
      const decodedToken = jwt.verify(token, publicKeyPem, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`
      });

      req.adminId = decodedToken.uid;
      req.adminEmail = decodedToken.email || '';
      next();
    } catch (error) {
      console.error('Auth token validation failure:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
