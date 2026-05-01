import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWelcomeMessage, updateUserProfile } from './appState.js'

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
