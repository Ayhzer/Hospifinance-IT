import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { SettingsProvider } from './contexts/SettingsContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PermissionsProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </PermissionsProvider>
    </AuthProvider>
  </React.StrictMode>
);
