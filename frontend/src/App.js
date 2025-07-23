import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import RunbookList from './pages/RunbookList';
import RunbookEditor from './pages/RunbookEditor';
import RunbookCreate from './pages/RunbookCreate';
import ExecutionViewer from './pages/ExecutionViewer';
import LoginPage from './pages/LoginPage';
import CredentialsPage from './pages/CredentialsPage';
import ExecutionHistoryPage from './pages/ExecutionHistoryPage';
import AuditHistoryPage from './pages/AuditHistoryPage';
import RunbookViewer from './pages/RunbookViewer';
import EnvironmentsPage from './pages/EnvironmentsPage';

function App() {
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

  return (
    <Router>
      {apiKey && <Header />}
      <main className={apiKey ? "py-3" : ""}>
        {apiKey ? (
          <Container>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <RunbookList />
                </ProtectedRoute>
              } />
              <Route path="/credentials" element={
                <ProtectedRoute>
                  <CredentialsPage />
                </ProtectedRoute>
              } />
              <Route path="/environments" element={
                <ProtectedRoute>
                  <EnvironmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/history" element={
                <ProtectedRoute>
                  <ExecutionHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/audit" element={
                <ProtectedRoute>
                  <AuditHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/runbooks/create" element={
                <ProtectedRoute>
                  <RunbookCreate />
                </ProtectedRoute>
              } />
              <Route path="/runbooks/:id" element={
                <ProtectedRoute>
                  <RunbookViewer />
                </ProtectedRoute>
              } />
              <Route path="/runbooks/:id/edit" element={
                <ProtectedRoute>
                  <RunbookEditor />
                </ProtectedRoute>
              } />
              <Route path="/executions/:id" element={
                <ProtectedRoute>
                  <ExecutionViewer />
                </ProtectedRoute>
              } />
            </Routes>
          </Container>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={
              <ProtectedRoute>
                <RunbookList />
              </ProtectedRoute>
            } />
          </Routes>
        )}
      </main>
    </Router>
  );
}

export default App;
