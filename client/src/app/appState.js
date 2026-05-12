export function buildWelcomeMessage(currentUser) {
  return `Welcome ${currentUser.username}!`
}

export function isGuestUser(currentUser) {
  return currentUser.email === 'guest@example.com'
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

export function buildMatchHistoryEntry({
  gameId,
  playedAt,
  opponent,
  playerRating,
  opponentRating,
  opponentRatingDelta,
  mode,
  result,
  ratingDelta,
}) {
  return {
    id: gameId,
    playedAt,
    opponent,
    playerRating,
    opponentRating,
    opponentRatingDelta,
    mode,
    result,
    ratingDelta,
  }
}

export function buildRatingHistoryEntry({
  gameId,
  playedAt,
  rating,
  ratingDelta,
}) {
  return {
    id: gameId,
    playedAt,
    rating,
    ratingDelta,
  }
}

export function applyRatedMatchResult(currentUser, matchResult) {
  const nextMatchHistory = [
    buildMatchHistoryEntry(matchResult),
    ...(currentUser.matchHistory ?? []).filter(
      (existingMatch) => existingMatch.id !== matchResult.gameId,
    ),
  ]
  const nextRatingHistory = [
    ...(currentUser.ratingHistory ?? []).filter(
      (existingPoint) => existingPoint.id !== matchResult.gameId,
    ),
    buildRatingHistoryEntry({
      gameId: matchResult.gameId,
      playedAt: matchResult.playedAt,
      rating: matchResult.ratingAfter,
      ratingDelta: matchResult.ratingDelta,
    }),
  ]

  return {
    ...currentUser,
    elo: matchResult.ratingAfter,
    matchHistory: nextMatchHistory,
    ratingHistory: nextRatingHistory,
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
