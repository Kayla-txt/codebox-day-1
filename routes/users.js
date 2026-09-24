const express = require('express');
const { getUserById, getUsers } = require('../services/userService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getUsers());
});

router.get('/:id', (req, res) => {
  const user = getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json(user);
});

module.exports = router;
