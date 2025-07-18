import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { getAuditLogs } from '../services/api';

function AuditHistoryPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await getAuditLogs();
        setLogs(data);
      } catch (err) {
        setError('Failed to fetch audit logs. Do you have the correct permissions?');
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <>
      <h1>Audit History</h1>
      <Table striped bordered hover responsive className="table-sm mt-3">
        <thead>
          <tr>
            <th>TIMESTAMP</th>
            <th>USER ID</th>
            <th>ACTION</th>
            <th>TARGET ID</th>
            <th>DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.user_id}</td>
              <td>{log.action}</td>
              <td>{log.target_id}</td>
              <td>{JSON.stringify(log.details)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default AuditHistoryPage;
