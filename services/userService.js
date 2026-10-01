const { supabase } = require('./supabaseClient');

async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .order('id');

  if (error) {
    throw error;
  }

  return data;
}

async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', Number(id))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = { getUserById, getUsers };
