export function buildWelcomeMessage(currentUser) {
  return `Welcome ${currentUser.username}!`
}

export function updateUserProfile(currentUser, updates) {
  return {
    ...currentUser,
    ...updates,
  }
}
