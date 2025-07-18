import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey'));

  useEffect(() => {
    const handleStorageChange = () => {
      setApiKey(localStorage.getItem('apiKey'));
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Also listen for manual updates (same window)
    const interval = setInterval(() => {
      const currentKey = localStorage.getItem('apiKey');
      if (currentKey !== apiKey) {
        setApiKey(currentKey);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [apiKey]);

  if (!apiKey) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
