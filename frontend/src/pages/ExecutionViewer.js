import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import { getExecutionStatus } from '../services/api';

const StatusBadge = ({ status }) => {
  let variant;
  switch (status) {
    case 'success':
    case 'completed':
      variant = 'success';
      break;
    case 'running':
      variant = 'primary';
      break;

    case 'error':
    case 'failed':
      variant = 'danger';
      break;
    default:
      variant = 'secondary';
  }
  return <Badge bg={variant}>{status.toUpperCase()}</Badge>;
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
    <>
      <Link to="/" className="btn btn-light my-3">
        Back to Runbooks
      </Link>
      <Row>
        <Col md={8}>
          <h2>
            Execution: {jobId} <StatusBadge status={job.status} />
          </h2>
        </Col>
        <Col md={4} className="text-end">
          <Button variant="primary" className="me-2">
            Run All
          </Button>
          <Button variant="danger">Stop</Button>
        </Col>
      </Row>

      <hr />

      {job.steps.map((step) => (
        <Card key={step.id} className="mb-3">
          <Card.Header>
            <StatusBadge status={step.status} />
            <strong className="ms-2">Step: {step.block_id}</strong>
          </Card.Header>
          <Card.Body>
            <pre className="bg-dark text-white p-3 rounded">
              <code>{step.output || 'No output...'}</code>
            </pre>
          </Card.Body>
        </Card>
      ))}
    </>
  );
}

export default ExecutionViewer;
