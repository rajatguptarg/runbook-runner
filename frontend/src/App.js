import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RunbookList from './pages/RunbookList';
import RunbookEditor from './pages/RunbookEditor';
import ExecutionViewer from './pages/ExecutionViewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RunbookList />} />
        <Route path="/runbooks/:id/edit" element={<RunbookEditor />} />
        <Route path="/executions/:id" element={<ExecutionViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
