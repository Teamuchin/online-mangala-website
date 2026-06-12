import { createRoot } from 'react-dom/client'
import { BrowserRouter} from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './app/AppDataProvider.jsx'
import { GlobalHeaderProvider } from './app/GlobalHeaderProvider.jsx'
import { SocketProvider } from './app/socketContext.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-client-id'

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <AppDataProvider>
      <GlobalHeaderProvider>
        <SocketProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SocketProvider>
      </GlobalHeaderProvider>
    </AppDataProvider>
  </GoogleOAuthProvider>
)
