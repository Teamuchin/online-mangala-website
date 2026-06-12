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
import MatchesPage from "./pages/MatchesPage.jsx"
import Banner from "./pages/Banner.jsx"
import LearnTrainPage from "./pages/LearnTrainPage.jsx"
import VerifyEmail from "./pages/VerifyEmail.jsx"
import ForgotPassword from "./pages/ForgotPassword.jsx"
import ResetPassword from "./pages/ResetPassword.jsx"
import { useAppData } from "./app/useAppData.js"
import FriendChatWidget from "./components/FriendChatWidget.jsx"
import CompleteProfileModal from "./components/CompleteProfileModal.jsx"

function RequireAuthenticatedRoute() {
  const { isAuthenticated } = useAppData()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function RequireUnauthenticatedRoute() {
  const { isAuthenticated } = useAppData()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

function App() {
  const { currentUser } = useAppData()

  return (
    <>
      <GlobalHeader />
      <Routes>
        <Route element={<RequireUnauthenticatedRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route element={<RequireAuthenticatedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<PracticeBoardPage />} />
          <Route path="/game/:gameId" element={<MangalaGame />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/member/:username" element={<ProfilePage />} />
          <Route path="/member/:username/games" element={<ProfileGamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/banner" element={<Banner />} />
          <Route path="/learn" element={<LearnTrainPage />} />
        </Route>
      </Routes>
      <FriendChatWidget key={currentUser?.id || 'guest'} />
      <CompleteProfileModal />
      <CompleteProfileModal />
    </>
  )
}

export default App
