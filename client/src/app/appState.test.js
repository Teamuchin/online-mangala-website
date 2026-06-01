import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAccountFormState,
  buildLoggedOutSessionUpdates,
  buildProfileUpdatesFromForm,
  buildWelcomeMessage,
  isGuestUser,
  mergeStoredAuthState,
  mergeStoredUser,
  updateUserProfile,
} from './appState.js'

test('buildWelcomeMessage formats the home greeting from the current user', () => {
  assert.equal(
    buildWelcomeMessage({ username: 'Username' }),
    'Welcome Username!',
  )
})

test('updateUserProfile merges incremental user updates without dropping existing fields', () => {
  const nextUser = updateUserProfile(
    { username: 'Username', elo: 1200, email: 'user@example.com' },
    { elo: 1250 },
  )

  assert.deepEqual(nextUser, {
    username: 'Username',
    elo: 1250,
    email: 'user@example.com',
  })
})

test('mergeStoredUser overlays stored profile values onto the seeded user shape', () => {
  assert.deepEqual(
    mergeStoredUser(
      {
        username: 'Username',
        email: 'username@example.com',
      },
      { username: 'UpdatedUser' },
    ),
    {
      username: 'UpdatedUser',
      email: 'username@example.com',
    },
  )
})

test('mergeStoredAuthState overlays stored auth values onto the default session shape', () => {
  assert.deepEqual(
    mergeStoredAuthState(
      { isAuthenticated: true, hasSeenBanner: false },
      { isAuthenticated: false },
    ),
    { isAuthenticated: false, hasSeenBanner: false },
  )
})

test('buildAccountFormState derives an editable draft from the current user', () => {
  assert.deepEqual(
    buildAccountFormState({
      username: 'Username',
      email: 'username@example.com',
    }),
    {
      username: 'Username',
      email: 'username@example.com',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  )
})

test('buildProfileUpdatesFromForm only keeps username updates', () => {
  assert.deepEqual(
    buildProfileUpdatesFromForm({
      username: 'NewName',
      email: 'new@example.com',
      currentPassword: 'secret',
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
    }),
    {
      username: 'NewName',
    },
  )
})

test('buildLoggedOutSessionUpdates marks the session logged out', () => {
  assert.deepEqual(buildLoggedOutSessionUpdates(), { isAuthenticated: false })
})

test('isGuestUser detects the guest session profile', () => {
  assert.equal(isGuestUser({ email: 'guest@example.com' }), true)
  assert.equal(isGuestUser({ email: 'username@example.com' }), false)
})
