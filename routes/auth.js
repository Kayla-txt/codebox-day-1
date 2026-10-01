const express = require('express');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

function credentialsFromRequest(req) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return { error: 'Enter a valid email address.' };
  }

  if (password.length < 8 || password.length > 72) {
    return { error: 'Use a password between 8 and 72 characters.' };
  }

  return { email, password };
}

function sessionResponse(session, message) {
  return {
    message,
    session: session
      ? {
          access_token: session.access_token,
          expires_at: session.expires_at,
          user: { id: session.user.id, email: session.user.email }
        }
      : null
  };
}

router.post('/signup', async (req, res) => {
  const credentials = credentialsFromRequest(req);
  if (credentials.error) return res.status(400).json({ error: credentials.error });

  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) return res.status(400).json({ error: 'Unable to create an account with those details.' });

  res.status(201).json(
    sessionResponse(
      data.session,
      'Account created.'
    )
  );
});

router.post('/login', async (req, res) => {
  const credentials = credentialsFromRequest(req);
  if (credentials.error) return res.status(400).json({ error: credentials.error });

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.session) return res.status(401).json({ error: 'Email or password is incorrect.' });

  res.status(200).json(sessionResponse(data.session, 'Signed in.'));
});

module.exports = router;
