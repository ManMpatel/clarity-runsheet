import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

document.documentElement.classList.remove('dark')

const stored = JSON.parse(localStorage.getItem('clarity-ui') || '{}')
const dark = stored?.state?.darkMode ?? false
if (dark) document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)