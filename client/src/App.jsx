import './App.css'
import { Route, Routes } from 'react-router-dom'
import GlobalHeader from './components/GlobalHeader.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import MangalaGame from './pages/MangalaGame.jsx'
import AccountSettings from './pages/AccountSettings.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ProfileGamesPage from './pages/ProfileGamesPage.jsx'
import Banner from './pages/Banner.jsx'
import LearnTrainPage from './pages/LearnTrainPage.jsx'

function App() {
  return (
    <>
      <GlobalHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/game/:gameId" element={<MangalaGame />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/member/:username" element={<ProfilePage />} />
        <Route path="/member/:username/games" element={<ProfileGamesPage />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/banner" element={<Banner />} />
        <Route path="/learn" element={<LearnTrainPage />} />
      </Routes>
    </>
  )
}

export default App
