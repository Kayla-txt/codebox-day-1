const express = require('express');
require('dotenv').config({ quiet: true });

const userRoutes = require('./routes/users');
const authenticateToken = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('hello from codebox');
});

app.use('/api/users', userRoutes);

app.get('/api/me', authenticateToken, (req, res) => {
  res.status(200).json({
    id: Number(req.user.sub),
    name: 'Alex'
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
