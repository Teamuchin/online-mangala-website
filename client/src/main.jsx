import { createRoot } from 'react-dom/client'
import { BrowserRouter} from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './app/AppDataProvider.jsx'
import { GlobalHeaderProvider } from './app/GlobalHeaderProvider.jsx'

createRoot(document.getElementById('root')).render(
  <AppDataProvider>
    <GlobalHeaderProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalHeaderProvider>
  </AppDataProvider>
)
