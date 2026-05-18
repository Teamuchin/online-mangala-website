export const APP_BRAND_NAME = 'Mangala'

const SEEDED_RATING_HISTORY = [
  {
    id: 'initial-rating',
    playedAt: '2026-05-01T00:00:00.000Z',
    rating: 1200,
    ratingDelta: 0,
  },
]

function buildSeededRatingHistory(id, rating) {
  return [
    {
      id: `initial-rating-${id}`,
      playedAt: '2026-05-01T00:00:00.000Z',
      rating,
      ratingDelta: 0,
    },
  ]
}

export const APP_ASSETS = {
  logo: '/logo.svg',
  accountIcon: '/accountbtn.svg',
  languageIcon: '/languagebtn.svg',
  settingsIcon: '/settingsbtn.png',
  decorationBoard: '/decorationboard.png',
  profilePicturePlaceholder: '/assets/profile-picture-placeholder.png',
}

export const INITIAL_CURRENT_USER = {
  id: 'registered-user',
  username: 'Username',
  elo: 1200,
  email: 'username@example.com',
  memberSince: 'May 2026',
  bio: '',
  profilePicture: '/assets/profile-picture-placeholder.png',
  matchHistory: [],
  ratingHistory: SEEDED_RATING_HISTORY,
}

export const GUEST_CURRENT_USER = {
  id: 'guest-user',
  username: 'Guest',
  elo: 1200,
  email: 'guest@example.com',
  memberSince: 'May 2026',
  bio: 'Playing as guest',
  profilePicture: '/assets/profile-picture-placeholder.png',
  matchHistory: [],
  ratingHistory: SEEDED_RATING_HISTORY,
}

export const BOT_PROFILES = [
  {
    id: 'bot-deniz',
    username: 'deniz-bot',
    displayName: 'Deniz',
    elo: 1000,
    email: '',
    memberSince: 'May 2026',
    bio: 'Automated Mangala opponent.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: buildSeededRatingHistory('bot-deniz', 1000),
    isBot: true,
  },
  {
    id: 'bot-toprak',
    username: 'toprak-bot',
    displayName: 'Toprak',
    elo: 1200,
    email: '',
    memberSince: 'May 2026',
    bio: 'Automated Mangala opponent.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: buildSeededRatingHistory('bot-toprak', 1200),
    isBot: true,
  },
  {
    id: 'bot-ruzgar',
    username: 'ruzgar-bot',
    displayName: 'Ruzgar',
    elo: 1400,
    email: '',
    memberSince: 'May 2026',
    bio: 'Automated Mangala opponent.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: buildSeededRatingHistory('bot-ruzgar', 1400),
    isBot: true,
  },
  {
    id: 'bot-alev',
    username: 'alev-bot',
    displayName: 'Alev',
    elo: 1600,
    email: '',
    memberSince: 'May 2026',
    bio: 'Automated Mangala opponent.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: buildSeededRatingHistory('bot-alev', 1600),
    isBot: true,
  },
  {
  },
]

export const PUBLIC_PROFILE_DIRECTORY = [
  {
    id: 'p1',
    username: 'Emre',
    elo: 1485,
    email: '',
    memberSince: 'May 2026',
    bio: 'Local match player.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: [],
  },
  {
    id: 'p2',
    username: 'Ayse',
    elo: 1520,
    email: '',
    memberSince: 'May 2026',
    bio: 'Local match player.',
    profilePicture: '/assets/profile-picture-placeholder.png',
    matchHistory: [],
    ratingHistory: [],
  },
  ...BOT_PROFILES,
]

export const LOCAL_MATCH_PLAYERS = {
  bottom: { id: 'p1', name: 'Emre', rating: 1485, timeLeft: 300 },
  top: { id: 'p2', name: 'Ayse', rating: 1520, timeLeft: 300 },
}

export const HOME_PRIMARY_ACTIONS = [
  { to: '/practice', className: 'localbtn', label: 'Practice Board' },
  { to: '/game/local', className: 'offlinebtn', label: 'Play Againist Bots' },
]

export const HOME_SECONDARY_ACTIONS = [
  { to: '/learn', className: 'learnbtn', label: 'Learn & Train' },
  { to: '/game/local', className: 'watchbtn', label: 'Watch Others' },
  { to: '/game/local', className: 'communitybtn', label: 'Community' },
]

export const BANNER_NAV_LINKS = ['Play', 'Learn', 'About']

export const BANNER_SLOGAN_LINES = [
  { accent: 'Play', text: APP_BRAND_NAME },
  { accent: 'Wherever', text: 'you like', className: 'shiftedLine' },
  { accent: 'However', text: 'you want' },
]

export const BANNER_ACTIONS = [
  { to: '/login', className: 'loginbtn', label: 'Log in' },
  { to: '/register', className: 'signupbtn', label: 'Sign up' },
  { to: '/register', className: 'signupbtn', label: 'Play as Guest' },
]

export const ACCOUNT_SETTINGS_FIELDS = [
  { id: 'username', name: 'usercredential', type: 'text', placeholder: 'Username', className: 'textinput' },
  { id: 'email', name: 'usercredential', type: 'email', placeholder: 'Email', className: 'textinput' },
  { id: 'currentPassword', name: 'userpwd', type: 'password', placeholder: 'Current Password', className: 'textinput' },
  { id: 'newPassword', name: 'newUserpwd', type: 'password', placeholder: 'New Password', className: 'textinput' },
  { id: 'confirmPassword', name: 'confirmUserpwd', type: 'password', placeholder: 'Confirm New Password', className: 'textinput' },
  { id: 'bio', name: 'bio', type: 'text', placeholder: 'Bio', className: 'bioinput' },
]
