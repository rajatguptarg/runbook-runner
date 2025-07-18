import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Row, Col } from 'react-bootstrap';
import { getExecutions, clearExecutions } from '../services/api';
import { Badge } from 'react-bootstrap';

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
    <>
      <Row>
        <Col>
          <h1>Execution History</h1>
        </Col>
        <Col className="text-end">
          <Button variant="light" onClick={fetchExecutions} className="me-2">
            <i className="bi bi-arrow-clockwise me-2"></i>Refresh
          </Button>
          <Button variant="danger" onClick={handleClear}>
            <i className="bi bi-trash-fill me-2"></i>Clear History
          </Button>
        </Col>
      </Row>
      <Table striped bordered hover responsive className="table-sm mt-3">
        <thead>
          <tr>
            <th>RUNBOOK</th>
            <th>STATUS</th>
            <th>STARTED AT</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((exec) => (
            <tr key={exec.id}>
              <td>{exec.runbook_title}</td>
              <td>
                <StatusBadge status={exec.status} />
              </td>
              <td>{new Date(exec.start_time).toLocaleString()}</td>
              <td>
                <Link to={`/executions/${exec.id}`}>
                  <Button variant="light" className="btn-sm">
                    View
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default ExecutionHistoryPage;
