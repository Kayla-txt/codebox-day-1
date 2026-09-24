const users = [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Sam' }
];

function getUsers() {
  return users;
}

function getUserById(id) {
  const userId = Number(id);
  return users.find((currentUser) => currentUser.id === userId);
}

module.exports = { getUserById, getUsers };
