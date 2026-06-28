import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import SetupGate from './components/setup/SetupGate';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PermissionsProvider>
        <SettingsProvider>
          <SetupGate>
            <App />
          </SetupGate>
        </SettingsProvider>
      </PermissionsProvider>
    </AuthProvider>
  </React.StrictMode>
);
