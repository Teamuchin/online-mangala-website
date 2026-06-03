const fs = require('fs');
const files = [
  'client/src/pages/MangalaGame.jsx',
  'client/src/pages/AccountSettings.jsx',
  'client/src/pages/ProfilePage.jsx',
  'client/src/components/mangala/MatchChat.jsx',
  'client/src/components/GlobalHeader.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/window\.localStorage\.getItem\('mangala\.authToken'\)/g, "(window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken'))");
  fs.writeFileSync(file, content);
});
console.log('Done');
