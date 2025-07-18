import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { getAuditLogs } from '../services/api';

const getActionColor = (action) => {
  switch (action?.toLowerCase()) {
    case 'create':
    case 'created':
      return { bg: '#d1f2eb', text: '#155724' };
    case 'update':
    case 'updated':
      return { bg: '#cce5ff', text: '#004085' };
    case 'delete':
    case 'deleted':
      return { bg: '#f8d7da', text: '#721c24' };
    case 'execute':
    case 'executed':
      return { bg: '#fff3cd', text: '#856404' };
    default:
      return { bg: '#e2e3e5', text: '#383d41' };
  }
};

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
    <div style={{ padding: '2rem 0' }}>
      <div className="mb-4">
        <h2 style={{ fontWeight: '600', color: '#2c3e50', margin: 0 }}>Audit History</h2>
        <p style={{ color: '#6c757d', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
          View all system activities and changes for compliance and security monitoring.
        </p>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <Table hover responsive className="mb-0" style={{ borderCollapse: 'separate' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Timestamp</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>User</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Action</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Target</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id} style={{
                borderTop: index === 0 ? 'none' : '1px solid #f1f3f4'
              }}>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle',
                  fontSize: '0.875rem',
                  color: '#6c757d'
                }}>
                  <div>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <span style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    fontFamily: 'monospace'
                  }}>
                    {log.user_id}
                  </span>
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <span style={{
                    backgroundColor: getActionColor(log.action).bg,
                    color: getActionColor(log.action).text,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}>
                  {log.target_id}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle',
                  fontSize: '0.875rem',
                  maxWidth: '300px'
                }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {JSON.stringify(log.details)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default AuditHistoryPage;
