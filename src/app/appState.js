export function buildWelcomeMessage(currentUser) {
  return `Welcome ${currentUser.username}!`
}

export function mergeStoredAuthState(defaultAuthState, storedAuthState) {
  if (!storedAuthState) {
    return defaultAuthState
  }

  return {
    ...defaultAuthState,
    ...storedAuthState,
  }
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

export function buildAuthenticatedSessionUpdates(currentUser, userOverrides = {}) {
  return {
    isAuthenticated: true,
    currentUser: updateUserProfile(currentUser, userOverrides),
  }
}

export function buildLoggedOutSessionUpdates() {
  return {
    isAuthenticated: false,
  }
}
