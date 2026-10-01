const express = require('express');
const authenticateToken = require('../middleware/auth');
const {
  addShoppingItem,
  deleteShoppingItem,
  getPlan,
  getPlanHistory,
  getPlanUpdates,
  getShoppingItems,
  isValidDate,
  isValidId,
  updatePlan,
  updateShoppingItem
} = require('../services/plannerService');

const router = express.Router();

router.use(['/daily-meals', '/shopping-items'], authenticateToken, (req, res, next) => {
  if (req.authSource !== 'supabase') {
    return res.status(401).json({ error: 'Sign in with your account to access the planner.' });
  }
  next();
});

router.get('/daily-meals', async (req, res, next) => {
  const mealDate = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isValidDate(mealDate)) return res.status(400).json({ error: 'Use a valid date in YYYY-MM-DD format.' });

  try {
    res.status(200).json({ plan: await getPlan(req.supabase, req.user.sub, mealDate) });
  } catch (error) {
    next(error);
  }
});

router.get('/daily-meals/history', async (req, res, next) => {
  const { start, end } = req.query;
  if (!isValidDate(start) || !isValidDate(end) || start > end) {
    return res.status(400).json({ error: 'Use valid start and end dates in YYYY-MM-DD format.' });
  }

  try {
    res.status(200).json({ plans: await getPlanHistory(req.supabase, start, end) });
  } catch (error) {
    next(error);
  }
});

router.patch('/daily-meals/:date', async (req, res, next) => {
  if (!isValidDate(req.params.date)) return res.status(400).json({ error: 'Use a valid date in YYYY-MM-DD format.' });
  const result = getPlanUpdates(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  try {
    res.status(200).json({ plan: await updatePlan(req.supabase, req.user.sub, req.params.date, result.updates) });
  } catch (error) {
    next(error);
  }
});

router.get('/shopping-items', async (req, res, next) => {
  try {
    res.status(200).json({ items: await getShoppingItems(req.supabase) });
  } catch (error) {
    next(error);
  }
});

router.post('/shopping-items', async (req, res, next) => {
  const itemName = typeof req.body.item_name === 'string' ? req.body.item_name.trim() : '';
  if (!itemName || itemName.length > 120) return res.status(400).json({ error: 'Enter an item between 1 and 120 characters.' });

  try {
    res.status(201).json({ item: await addShoppingItem(req.supabase, req.user.sub, itemName) });
  } catch (error) {
    next(error);
  }
});

router.patch('/shopping-items/:id', async (req, res, next) => {
  if (!isValidId(req.params.id) || typeof req.body.is_checked !== 'boolean') {
    return res.status(400).json({ error: 'Use a valid item and checked value.' });
  }

  try {
    const item = await updateShoppingItem(req.supabase, req.params.id, req.body.is_checked);
    if (!item) return res.status(404).json({ error: 'Shopping item not found.' });
    res.status(200).json({ item });
  } catch (error) {
    next(error);
  }
});

router.delete('/shopping-items/:id', async (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Use a valid shopping item.' });

  try {
    const item = await deleteShoppingItem(req.supabase, req.params.id);
    if (!item) return res.status(404).json({ error: 'Shopping item not found.' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
