import "./App.css"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import GlobalHeader from "./components/GlobalHeader.jsx"
import Login from "./pages/Login.jsx"
import Home from "./pages/Home.jsx"
import Register from "./pages/Register.jsx"
import MangalaGame, { PracticeBoardPage } from "./pages/MangalaGame.jsx"
import AccountSettings from "./pages/AccountSettings.jsx"
import ProfilePage from "./pages/ProfilePage.jsx"
import ProfileGamesPage from "./pages/ProfileGamesPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"
import Banner from "./pages/Banner.jsx"
import LearnTrainPage from "./pages/LearnTrainPage.jsx"
import { useAppData } from "./app/useAppData.js"

function RequireAuthenticatedRoute() {
  const { isAuthenticated } = useAppData()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function App() {
  return (
    <>
      <GlobalHeader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<RequireAuthenticatedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<PracticeBoardPage />} />
          <Route path="/game/:gameId" element={<MangalaGame />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/member/:username" element={<ProfilePage />} />
          <Route path="/member/:username/games" element={<ProfileGamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/banner" element={<Banner />} />
          <Route path="/learn" element={<LearnTrainPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
