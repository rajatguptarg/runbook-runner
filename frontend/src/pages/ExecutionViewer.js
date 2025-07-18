import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import { getExecutionStatus } from '../services/api';

const StatusBadge = ({ status }) => {
  let bgColor, textColor, icon;
  switch (status) {
    case 'success':
    case 'completed':
      bgColor = '#d1f2eb';
      textColor = '#155724';
      icon = 'bi-check-circle';
      break;
    case 'running':
      bgColor = '#cce5ff';
      textColor = '#004085';
      icon = 'bi-arrow-clockwise';
      break;
    case 'error':
    case 'failed':
      bgColor = '#f8d7da';
      textColor = '#721c24';
      icon = 'bi-x-circle';
      break;
    default:
      bgColor = '#e2e3e5';
      textColor = '#383d41';
      icon = 'bi-circle';
  }
  return (
    <span style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <i className={icon}></i>
      {status}
    </span>
  );
};

function ExecutionViewer() {
  const { id: jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await getExecutionStatus(jobId);
        setJob(data);
        setLoading(false);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError('Failed to fetch execution status.');
        clearInterval(intervalRef.current);
        console.error(err);
      }
    };

    fetchStatus(); // Initial fetch
    intervalRef.current = setInterval(fetchStatus, 2000); // Poll every 2 seconds

    return () => clearInterval(intervalRef.current); // Cleanup on unmount
  }, [jobId]);

  if (loading) {
    return <Spinner animation="border" />;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef'
      }}>
        <Row className="align-items-center">
          <Col>
            <div className="d-flex align-items-center mb-2">
              <h1 style={{
                fontWeight: '600',
                color: '#2c3e50',
                margin: 0,
                marginRight: '1rem'
              }}>
                Runbook: {job.runbook_title || 'Unknown'}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p style={{
              color: '#6c757d',
              fontSize: '0.9rem',
              margin: 0
            }}>
              Execution ID: {jobId} • Started: {job.start_time ? new Date(job.start_time).toLocaleString() : 'Unknown'}
            </p>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Button
                variant="primary"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '8px 16px'
                }}
              >
                <i className="bi bi-play me-2"></i>Run All
              </Button>
              <Button
                variant="outline-danger"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '8px 16px'
                }}
              >
                <i className="bi bi-stop me-2"></i>Stop
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Steps */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          <i className="bi bi-terminal me-2" style={{ fontSize: '1.2rem' }}></i>
          Execution Steps
        </h3>

        {job.steps && job.steps.length > 0 ? (
          <div>
            {job.steps.map((step, index) => (
              <div
                key={step.id}
                style={{
                  marginBottom: '1.5rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1rem',
                  borderBottom: '1px solid #e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div className="d-flex align-items-center">
                    <span style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginRight: '1rem'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <h6 style={{ margin: 0, fontWeight: '600', color: '#2c3e50' }}>
                        {step.block_name || `Step ${step.block_id}`}
                      </h6>
                      <p style={{
                        margin: 0,
                        color: '#6c757d',
                        fontSize: '0.875rem'
                      }}>
                        Block ID: {step.block_id}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={step.status} />
                </div>

                <div style={{ padding: '1.5rem' }}>
                  {step.output ? (
                    <div style={{
                      backgroundColor: '#1e1e1e',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '1rem',
                      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {step.output}
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      border: '2px dashed #dee2e6',
                      borderRadius: '6px',
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6c757d'
                    }}>
                      <i className="bi bi-hourglass-split" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {step.status === 'running' ? 'Executing...' : 'No output available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6c757d'
          }}>
            <i className="bi bi-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <h5 style={{ fontWeight: '500', marginBottom: '0.5rem' }}>No execution steps</h5>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              This execution doesn't have any steps recorded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionViewer;
