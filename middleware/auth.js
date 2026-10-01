const jwt = require('jsonwebtoken');
const { createUserClient, supabase } = require('../services/supabaseClient');

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required. Add it to your .env file before starting the server.');
}

async function authenticateToken(req, res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    req.authSource = 'local';
    return next();
  } catch {
    // Supabase access tokens use Supabase's own signing configuration. Asking
    // Supabase for the user verifies the token before we attach its identity.
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = {
      sub: data.user.id,
      email: data.user.email
    };
    req.authSource = 'supabase';
    req.supabase = createUserClient(token);
    return next();
  }
}

module.exports = authenticateToken;
