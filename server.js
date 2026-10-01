const express = require('express');
const path = require('path');
require('dotenv').config({ quiet: true });

const authRoutes = require('./routes/auth');
const plannerRoutes = require('./routes/planner');
const userRoutes = require('./routes/users');
const authenticateToken = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.send('hello from meal planner');
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.use('/app', express.static(path.join(__dirname, 'src')));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', plannerRoutes);

app.get('/api/me', authenticateToken, (req, res) => {
  res.status(200).json({
    id: req.authSource === 'supabase' ? req.user.sub : Number(req.user.sub),
    name: 'Alex'
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }

  console.error('Unexpected API error:', error.message);
  res.status(500).json({ error: 'The server could not complete that request.' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
