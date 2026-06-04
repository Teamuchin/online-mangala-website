export function buildWelcomeMessage(currentUser) {
  return `Welcome ${currentUser.username}!`
}

export function isGuestUser(currentUser) {
  return Boolean(currentUser?.email?.startsWith('guest-') && currentUser?.email?.endsWith('@example.com'))
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
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

export function buildProfileUpdatesFromForm(formState) {
  return {
    username: String(formState.username || '').trim(),
    email: String(formState.email || '').trim(),
  }
}

export function buildLoggedOutSessionUpdates() {
  return {
    isAuthenticated: false,
  }
}
