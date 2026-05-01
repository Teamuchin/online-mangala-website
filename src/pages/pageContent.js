export const HOME_ACCOUNT_SUMMARY = {
  username: 'Username',
  eloLabel: 'Elo: 1200',
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
  { accent: 'Play', text: 'Mangala' },
  { accent: 'Wherever', text: 'you like', className: 'shiftedLine' },
  { accent: 'However', text: 'you want' },
]

export const ACCOUNT_SETTINGS_FIELDS = [
  { id: 'username', name: 'usercredential', type: 'text', placeholder: 'Username', className: 'textinput' },
  { id: 'email', name: 'usercredential', type: 'email', placeholder: 'Email', className: 'textinput' },
  { id: 'currentPassword', name: 'userpwd', type: 'password', placeholder: 'Current Password', className: 'textinput' },
  { id: 'newPassword', name: 'newUserpwd', type: 'password', placeholder: 'New Password', className: 'textinput' },
  { id: 'confirmPassword', name: 'confirmUserpwd', type: 'password', placeholder: 'Confirm New Password', className: 'textinput' },
  { id: 'bio', name: 'bio', type: 'text', placeholder: 'Bio', className: 'bioinput' },
]
