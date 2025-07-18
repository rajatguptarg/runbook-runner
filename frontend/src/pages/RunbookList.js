import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { Table, Button, Row, Col } from 'react-bootstrap';
import { getRunbooks, executeRunbook } from '../services/api';

function RunbookList() {
  const [runbooks, setRunbooks] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRunbooks = async () => {
      try {
        const response = await getRunbooks();
        setRunbooks(response.data);
      } catch (err) {
        setError('Failed to fetch runbooks. Are you logged in?');
        console.error(err);
      }
    };

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

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <>
      <Row className="align-items-center">
        <Col>
          <h1>Runbooks</h1>
        </Col>
        <Col className="text-end">
          <LinkContainer to="/runbooks/create">
            <Button className="my-3">
              <i className="bi bi-plus-lg me-2"></i>Create Runbook
            </Button>
          </LinkContainer>
        </Col>
      </Row>
      <Table striped bordered hover responsive className="table-sm">
        <thead>
          <tr>
            <th>TITLE</th>
            <th>DESCRIPTION</th>
            <th>VERSION</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {runbooks.map((runbook) => (
            <tr key={runbook.id}>
              <td>
                <Link to={`/runbooks/${runbook.id}`}>{runbook.title}</Link>
              </td>
              <td>{runbook.description}</td>
              <td>{runbook.version}</td>
              <td>
                <Link to={`/runbooks/${runbook.id}/edit`}>
                  <Button variant="light" className="btn-sm mx-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  className="btn-sm mx-1"
                  onClick={() => executeHandler(runbook.id)}
                >
                  <i className="bi bi-play-fill"></i>
                </Button>
                <Button variant="danger" className="btn-sm mx-1">
                  <i className="bi bi-trash-fill"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default RunbookList;
