const express = require('express');
const { getUserById, getUsers } = require('../services/userService');

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await getUsers());
});

router.get('/:id', async (req, res) => {
  const user = await getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json(user);
});

module.exports = router;
