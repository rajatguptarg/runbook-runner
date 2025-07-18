import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Row, Col } from 'react-bootstrap';
import { getExecutions, clearExecutions } from '../services/api';
import { Badge } from 'react-bootstrap';

const StatusBadge = ({ status }) => {
  let bgColor, textColor;
  switch (status) {
    case 'success':
    case 'completed':
      bgColor = '#d1f2eb';
      textColor = '#155724';
      break;
    case 'running':
      bgColor = '#cce5ff';
      textColor = '#004085';
      break;
    case 'error':
    case 'failed':
      bgColor = '#f8d7da';
      textColor = '#721c24';
      break;
    default:
      bgColor = '#e2e3e5';
      textColor = '#383d41';
  }
  return (
    <span style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase'
    }}>
      {status}
    </span>
  );
};

function ExecutionHistoryPage() {
  const [executions, setExecutions] = useState([]);
  const [error, setError] = useState(null);

  const fetchExecutions = async () => {
    try {
      const { data } = await getExecutions();
      setExecutions(data);
    } catch (err) {
      setError('Failed to fetch execution history.');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all execution history?')) {
      try {
        await clearExecutions();
        fetchExecutions();
      } catch (err) {
        setError('Failed to clear history.');
        console.error(err);
      }
    }
  };

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <Row className="align-items-center mb-4">
        <Col>
          <h2 style={{ fontWeight: '600', color: '#2c3e50', margin: 0 }}>Execution History</h2>
        </Col>
        <Col className="text-end">
          <Button
            variant="outline-secondary"
            onClick={fetchExecutions}
            className="me-2"
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              padding: '8px 16px'
            }}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>Refresh
          </Button>
          <Button
            variant="outline-danger"
            onClick={handleClear}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              padding: '8px 16px'
            }}
          >
            <i className="bi bi-trash me-2"></i>Clear History
          </Button>
        </Col>
      </Row>

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
              }}>Runbook</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Status</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Started At</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '120px'
              }}></th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec, index) => (
              <tr key={exec.id} style={{
                borderTop: index === 0 ? 'none' : '1px solid #f1f3f4'
              }}>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  {exec.runbook_title}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <StatusBadge status={exec.status} />
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle',
                  fontSize: '0.875rem'
                }}>
                  {new Date(exec.start_time).toLocaleDateString()} at {new Date(exec.start_time).toLocaleTimeString()}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <div className="d-flex justify-content-end">
                    <Link to={`/executions/${exec.id}`}>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#007bff',
                          padding: '6px 12px',
                          fontWeight: '500'
                        }}
                      >
                        View
                      </Button>
                    </Link>
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

export default ExecutionHistoryPage;
