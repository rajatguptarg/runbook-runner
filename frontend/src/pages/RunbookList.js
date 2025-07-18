import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { Table, Button, Row, Col, Badge } from 'react-bootstrap';
import { getRunbooks, executeRunbook, deleteRunbook } from '../services/api';

function RunbookList() {
  const [runbooks, setRunbooks] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchRunbooks = async () => {
    try {
      const response = await getRunbooks();
      setRunbooks(response.data);
    } catch (err) {
      setError('Failed to fetch runbooks. Are you logged in?');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRunbooks();
  }, []);

  const executeHandler = async (id) => {
    try {
      const { data } = await executeRunbook(id);
      navigate(`/executions/${data.job_id}`);
    } catch (err) {
      setError('Failed to start execution.');
      console.error(err);
    }
  };

  const deleteHandler = async (id) => {
    if (window.confirm('Are you sure you want to delete this runbook?')) {
      try {
        await deleteRunbook(id);
        fetchRunbooks(); // Refresh the list
      } catch (err) {
        setError('Failed to delete runbook.');
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
          <h2 style={{ fontWeight: '600', color: '#2c3e50', margin: 0 }}>Runbooks</h2>
        </Col>
        <Col className="text-end">
          <LinkContainer to="/runbooks/create">
            <Button
              variant="primary"
              style={{
                borderRadius: '6px',
                fontWeight: '500',
                padding: '8px 16px'
              }}
            >
              + New Runbook
            </Button>
          </LinkContainer>
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
              }}>Title</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Description</th>
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
            {runbooks.map((runbook, index) => (
              <tr key={runbook.id} style={{
                borderTop: index === 0 ? 'none' : '1px solid #f1f3f4'
              }}>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <Link
                    to={`/runbooks/${runbook.id}`}
                    style={{
                      textDecoration: 'none',
                      color: '#2c3e50',
                      fontWeight: '500'
                    }}
                  >
                    {runbook.title}
                  </Link>
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle'
                }}>
                  {runbook.description}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <div className="d-flex justify-content-end">
                    <Link to={`/runbooks/${runbook.id}/edit`}>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-2"
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#6c757d',
                          padding: '6px 8px'
                        }}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                    </Link>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => executeHandler(runbook.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#007bff',
                        padding: '6px 8px'
                      }}
                    >
                      <i className="bi bi-play"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => deleteHandler(runbook.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#dc3545',
                        padding: '6px 8px'
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
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

export default RunbookList;
