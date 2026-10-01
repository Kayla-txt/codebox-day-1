const mealFields = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
const planColumns = 'meal_date, breakfast, lunch, dinner, snack, created_at, updated_at';

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isValidId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getPlanUpdates(body) {
  const updates = {};

  for (const field of mealFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string' || body[field].trim().length > 500) {
        return { error: `${field} must be text up to 500 characters.` };
      }
      updates[field] = body[field].trim();
    }
  }

  return Object.keys(updates).length ? { updates } : { error: 'No meal changes were supplied.' };
}

async function ensurePlan(client, userId, mealDate) {
  return client
    .from('daily_meal_plans')
    .upsert({ user_id: userId, meal_date: mealDate }, { onConflict: 'user_id,meal_date', ignoreDuplicates: true });
}

async function getPlan(client, userId, mealDate) {
  const { error: createError } = await ensurePlan(client, userId, mealDate);
  if (createError) throw createError;

  const { data, error } = await client
    .from('daily_meal_plans')
    .select(planColumns)
    .eq('user_id', userId)
    .eq('meal_date', mealDate)
    .single();
  if (error) throw error;
  return data;
}

async function getPlanHistory(client, startDate, endDate) {
  const { data, error } = await client
    .from('daily_meal_plans')
    .select(planColumns)
    .gte('meal_date', startDate)
    .lte('meal_date', endDate)
    .order('meal_date', { ascending: true });
  if (error) throw error;
  return data;
}

async function updatePlan(client, userId, mealDate, updates) {
  const { error: createError } = await ensurePlan(client, userId, mealDate);
  if (createError) throw createError;

  const { data, error } = await client
    .from('daily_meal_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('meal_date', mealDate)
    .select(planColumns)
    .single();
  if (error) throw error;
  return data;
}

async function getShoppingItems(client) {
  const { data, error } = await client
    .from('shopping_items')
    .select('id, item_name, is_checked, created_at')
    .order('is_checked', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function addShoppingItem(client, userId, itemName) {
  const { data, error } = await client
    .from('shopping_items')
    .insert({ user_id: userId, item_name: itemName })
    .select('id, item_name, is_checked, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function updateShoppingItem(client, itemId, isChecked) {
  const { data, error } = await client
    .from('shopping_items')
    .update({ is_checked: isChecked })
    .eq('id', itemId)
    .select('id, item_name, is_checked, created_at')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteShoppingItem(client, itemId) {
  const { data, error } = await client
    .from('shopping_items')
    .delete()
    .eq('id', itemId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
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
};
