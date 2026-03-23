import './App.css'
import { Route, Routes } from 'react-router-dom'
import Login from "./pages/Login.jsx"
import Home from "./pages/Home.jsx"
import Register from "./pages/Register.jsx"
import MangalaGame from "./pages/MangalaGame.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/game/local" element={<MangalaGame />} />
    </Routes>
  )
}

export default App
