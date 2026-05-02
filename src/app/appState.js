export function buildWelcomeMessage(currentUser) {
  return `Welcome ${currentUser.username}!`
}

export function mergeStoredUser(initialCurrentUser, storedCurrentUser) {
  if (!storedCurrentUser) {
    return initialCurrentUser
  }

  return {
    ...initialCurrentUser,
    ...storedCurrentUser,
  }
}

export function updateUserProfile(currentUser, updates) {
  return {
    ...currentUser,
    ...updates,
  }
}

export function buildAccountFormState(currentUser) {
  return {
    username: currentUser.username,
    email: currentUser.email,
    bio: currentUser.bio,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    profilePicture: null,
  }
}

export function buildProfileUpdatesFromForm(formState) {
  return {
    username: formState.username,
    email: formState.email,
    bio: formState.bio,
  }
}
