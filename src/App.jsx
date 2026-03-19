import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Login from "./pages/Login.jsx"
import Home from "./pages/Home.jsx"
import Register from "./pages/Register.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}

export default App
