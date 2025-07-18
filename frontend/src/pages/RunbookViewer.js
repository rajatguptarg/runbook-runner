import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Row, Col, Spinner } from 'react-bootstrap';
import { getRunbookDetails } from '../services/api';
import Block from '../components/Block';

import ReactMarkdown from 'react-markdown';

function RunbookViewer() {
  const { id: runbookId } = useParams();
  const [runbook, setRunbook] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRunbook = async () => {
      try {
        const { data } = await getRunbookDetails(runbookId);
        setRunbook(data);
      } catch (err) {
        setError('Failed to fetch runbook details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRunbook();
  }, [runbookId]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!runbook) return <div>Runbook not found.</div>;

  return (
    <>
      <Row className="align-items-center my-3">
        <Col>
          <h1>{runbook.title}</h1>
          <ReactMarkdown>{runbook.description}</ReactMarkdown>
        </Col>
        <Col className="text-end">
          <Link to={`/runbooks/${runbook.id}/edit`} className="btn btn-primary">
            <i className="bi bi-pencil-fill me-2"></i>Edit Runbook
          </Link>
        </Col>
      </Row>

      <hr />

      <h2>Steps</h2>
      <div>
        {runbook.blocks
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <Block key={block.id} block={block} isEditable={false} />
          ))}
      </div>
    </>
  );
}

export default RunbookViewer;
