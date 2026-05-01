export const APP_BRAND_NAME = 'Mangala'

export const APP_ASSETS = {
  logo: '/logo.svg',
  accountIcon: '/accountbtn.svg',
  languageIcon: '/languagebtn.svg',
  settingsIcon: '/settingsbtn.png',
  decorationBoard: '/decorationboard.png',
  profilePicturePlaceholder: '/assets/profile-picture-placeholder.png',
}

export const INITIAL_CURRENT_USER = {
  username: 'Username',
  elo: 1200,
  email: 'username@example.com',
  bio: '',
  profilePicture: '/assets/profile-picture-placeholder.png',
}

export const LOCAL_MATCH_PLAYERS = {
  bottom: { id: 'p1', name: 'Emre', rating: 1485, timeLeft: 300 },
  top: { id: 'p2', name: 'Ayse', rating: 1520, timeLeft: 300 },
}

export const HOME_PRIMARY_ACTIONS = [
  { to: '/game/local', className: 'localbtn', label: 'Local Match' },
  { to: '/game/local', className: 'offlinebtn', label: 'Play Againist Bots' },
]

export const HOME_SECONDARY_ACTIONS = [
  { to: '/banner', className: 'learnbtn', label: 'Learn & Train' },
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
