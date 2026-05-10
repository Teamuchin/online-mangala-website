import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCOUNT_SETTINGS_FIELDS,
  APP_ASSETS,
  APP_BRAND_NAME,
  BANNER_ACTIONS,
  BANNER_SLOGAN_LINES,
  HOME_PRIMARY_ACTIONS,
  HOME_SECONDARY_ACTIONS,
  INITIAL_CURRENT_USER,
  LOCAL_MATCH_PLAYERS,
} from './mockAppData.js'

test('app brand and seeded current user stay aligned with the current UI copy', () => {
  assert.equal(APP_BRAND_NAME, 'Mangala')
  assert.equal(INITIAL_CURRENT_USER.username, 'Username')
  assert.equal(INITIAL_CURRENT_USER.elo, 1200)
  assert.equal(INITIAL_CURRENT_USER.email, 'username@example.com')
  assert.equal(INITIAL_CURRENT_USER.memberSince, 'May 2026')
  assert.equal(INITIAL_CURRENT_USER.profilePicture, '/assets/profile-picture-placeholder.png')
})

test('asset paths expose the static files referenced by the UI', () => {
  assert.equal(APP_ASSETS.logo, '/logo.svg')
  assert.equal(APP_ASSETS.accountIcon, '/accountbtn.svg')
  assert.equal(APP_ASSETS.languageIcon, '/languagebtn.svg')
  assert.equal(APP_ASSETS.settingsIcon, '/settingsbtn.png')
  assert.equal(APP_ASSETS.decorationBoard, '/decorationboard.png')
  assert.equal(
    APP_ASSETS.profilePicturePlaceholder,
    '/assets/profile-picture-placeholder.png',
  )
})

test('local match players keep the seeded game participants intact', () => {
  assert.deepEqual(LOCAL_MATCH_PLAYERS, {
    bottom: { id: 'p1', name: 'Emre', rating: 1485, timeLeft: 300 },
    top: { id: 'p2', name: 'Ayse', rating: 1520, timeLeft: 300 },
  })
})

test('home and banner actions preserve their current routes and labels', () => {
  assert.deepEqual(HOME_PRIMARY_ACTIONS, [
    { to: '/game/local', className: 'localbtn', label: 'Local Match' },
    { to: '/game/local', className: 'offlinebtn', label: 'Play Againist Bots' },
  ])

  assert.deepEqual(HOME_SECONDARY_ACTIONS, [
    { to: '/learn', className: 'learnbtn', label: 'Learn & Train' },
    { to: '/game/local', className: 'watchbtn', label: 'Watch Others' },
    { to: '/game/local', className: 'communitybtn', label: 'Community' },
  ])

  assert.deepEqual(BANNER_ACTIONS, [
    { to: '/login', className: 'loginbtn', label: 'Log in' },
    { to: '/register', className: 'signupbtn', label: 'Sign up' },
    { to: '/register', className: 'signupbtn', label: 'Play as Guest' },
  ])
})

test('banner slogans and account settings fields preserve the current page structure', () => {
  assert.deepEqual(BANNER_SLOGAN_LINES, [
    { accent: 'Play', text: 'Mangala' },
    { accent: 'Wherever', text: 'you like', className: 'shiftedLine' },
    { accent: 'However', text: 'you want' },
  ])

  assert.equal(ACCOUNT_SETTINGS_FIELDS.length, 6)
  assert.deepEqual(ACCOUNT_SETTINGS_FIELDS[0], {
    id: 'username',
    name: 'usercredential',
    type: 'text',
    placeholder: 'Username',
    className: 'textinput',
  })
  assert.deepEqual(ACCOUNT_SETTINGS_FIELDS.at(-1), {
    id: 'bio',
    name: 'bio',
    type: 'text',
    placeholder: 'Bio',
    className: 'bioinput',
  })
})
