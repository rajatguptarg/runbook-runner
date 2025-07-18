import React, { useState, useEffect } from 'react';
import { getRunbooks } from '../services/api';

function RunbookList() {
  const [runbooks, setRunbooks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRunbooks = async () => {
      try {
        const response = await getRunbooks();
        setRunbooks(response.data);
      } catch (err) {
        setError('Failed to fetch runbooks. Is the backend running?');
        console.error(err);
      }
    };

    fetchRunbooks();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Runbooks</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black', padding: '8px' }}>Title</th>
            <th style={{ border: '1px solid black', padding: '8px' }}>Description</th>
            <th style={{ border: '1px solid black', padding: '8px' }}>Version</th>
            <th style={{ border: '1px solid black', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {runbooks.map((runbook) => (
            <tr key={runbook.id}>
              <td style={{ border: '1px solid black', padding: '8px' }}>{runbook.title}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{runbook.description}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{runbook.version}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>
                <button>Edit</button>
                <button>Execute</button>
                <button>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RunbookList;
