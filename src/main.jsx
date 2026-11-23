import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { UnreadMessagesProvider } from './context/UnreadMessagesContext.jsx'
import './styles/tokens.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <NotificationProvider>
        <UnreadMessagesProvider>
          <App />
        </UnreadMessagesProvider>
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
)
