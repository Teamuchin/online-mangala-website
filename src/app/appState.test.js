import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAccountFormState,
  buildProfileUpdatesFromForm,
  buildWelcomeMessage,
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
    { elo: 1250, bio: 'New bio' },
  )

  assert.deepEqual(nextUser, {
    username: 'Username',
    elo: 1250,
    email: 'user@example.com',
    bio: 'New bio',
  })
})

test('mergeStoredUser overlays stored profile values onto the seeded user shape', () => {
  assert.deepEqual(
    mergeStoredUser(
      {
        username: 'Username',
        email: 'username@example.com',
        bio: '',
        profilePicture: '/assets/profile-picture-placeholder.png',
      },
      { username: 'UpdatedUser', bio: 'Saved bio' },
    ),
    {
      username: 'UpdatedUser',
      email: 'username@example.com',
      bio: 'Saved bio',
      profilePicture: '/assets/profile-picture-placeholder.png',
    },
  )
})

test('buildAccountFormState derives an editable draft from the current user', () => {
  assert.deepEqual(
    buildAccountFormState({
      username: 'Username',
      email: 'username@example.com',
      bio: 'About me',
    }),
    {
      username: 'Username',
      email: 'username@example.com',
      bio: 'About me',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      profilePicture: null,
    },
  )
})

test('buildProfileUpdatesFromForm only keeps supported profile fields', () => {
  assert.deepEqual(
    buildProfileUpdatesFromForm({
      username: 'NewName',
      email: 'new@example.com',
      bio: 'Updated bio',
      currentPassword: 'secret',
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
      profilePicture: { name: 'avatar.png' },
    }),
    {
      username: 'NewName',
      email: 'new@example.com',
      bio: 'Updated bio',
    },
  )
})
