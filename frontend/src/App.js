import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import RunbookList from './pages/RunbookList';
import RunbookEditor from './pages/RunbookEditor';
import RunbookCreate from './pages/RunbookCreate';
import ExecutionViewer from './pages/ExecutionViewer';
import LoginPage from './pages/LoginPage';
import CredentialsPage from './pages/CredentialsPage';
import ExecutionHistoryPage from './pages/ExecutionHistoryPage';
import AuditHistoryPage from './pages/AuditHistoryPage';

import RunbookViewer from './pages/RunbookViewer';

function App() {
  return (
    <Router>
      <Header />
      <main className="py-3">
        <Container>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RunbookList />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/history" element={<ExecutionHistoryPage />} />
            <Route path="/audit" element={<AuditHistoryPage />} />
            <Route path="/runbooks/create" element={<RunbookCreate />} />
            <Route path="/runbooks/:id" element={<RunbookViewer />} />
            <Route path="/runbooks/:id/edit" element={<RunbookEditor />} />
            <Route path="/executions/:id" element={<ExecutionViewer />} />
          </Routes>
        </Container>
      </main>
    </Router>
  );
}

export default App;
