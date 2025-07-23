import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { getRunbookDetails, getEnvironments } from '../services/api';
import Block from '../components/Block';

import ReactMarkdown from 'react-markdown';

const getBlockTypeColor = (type) => {
  switch (type) {
    case 'instruction':
      return { bg: '#e3f2fd', text: '#1976d2' };
    case 'command':
      return { bg: '#f3e5f5', text: '#7b1fa2' };
    case 'condition':
      return { bg: '#fff3e0', text: '#f57c00' };
    case 'timer':
      return { bg: '#e8f5e8', text: '#388e3c' };
    case 'api':
      return { bg: '#fce4ec', text: '#c2185b' };
    default:
      return { bg: '#e2e3e5', text: '#383d41' };
  }
};

function RunbookViewer() {
  const { id: runbookId } = useParams();
  const [runbook, setRunbook] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [runbookRes, environmentsRes] = await Promise.all([
          getRunbookDetails(runbookId),
          getEnvironments(),
        ]);
        setRunbook(runbookRes.data);
        setEnvironments(environmentsRes.data);
      } catch (err) {
        setError('Failed to fetch runbook details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [runbookId]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!runbook) return <div>Runbook not found.</div>;

  const selectedEnvironment = environments.find(
    (env) => env.id === runbook.environment_id
  );

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
        <Row className="align-items-start mb-3">
          <Col>
            <h1 style={{
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '1rem',
              fontSize: '2rem'
            }}>
              {runbook.title}
            </h1>

            <div style={{
              color: '#6c757d',
              fontSize: '1rem',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              <ReactMarkdown>{runbook.description}</ReactMarkdown>
            </div>

            {selectedEnvironment && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h6 style={{ fontWeight: '600', color: '#2c3e50' }}>
                  Execution Environment
                </h6>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  {selectedEnvironment.name}
                </p>
              </div>
            )}

            {runbook.tags && runbook.tags.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {runbook.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginRight: '0.5rem',
                      display: 'inline-block'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Col>
          <Col className="text-end" xs="auto">
            <Link
              to={`/runbooks/${runbook.id}/edit`}
              style={{ textDecoration: 'none' }}
            >
              <Button
                variant="primary"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '10px 20px'
                }}
              >
                <i className="bi bi-pencil me-2"></i>Edit Runbook
              </Button>
            </Link>
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
          <i className="bi bi-list-ol me-2" style={{ fontSize: '1.2rem' }}></i>
          Steps
        </h3>

        <div>
          {runbook.blocks && runbook.blocks.length > 0 ? (
            runbook.blocks
              .sort((a, b) => a.order - b.order)
              .map((block, index) => (
                <div
                  key={block.id}
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
                    alignItems: 'center'
                  }}>
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
                        {block.name || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
                      </h6>
                      <span style={{
                        backgroundColor: getBlockTypeColor(block.type).bg,
                        color: getBlockTypeColor(block.type).text,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginTop: '4px',
                        display: 'inline-block'
                      }}>
                        {block.type}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <Block
                      block={block}
                      runbookId={runbookId}
                      isEditable={false}
                      onAddNestedBlock={() => {}} // Not editable in viewer
                      onEditNestedBlock={() => {}} // Not editable in viewer
                      onDeleteNestedBlock={() => {}} // Not editable in viewer
                    />
                  </div>
                </div>
              ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6c757d'
            }}>
              <i className="bi bi-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
              <h5 style={{ fontWeight: '500', marginBottom: '0.5rem' }}>No steps defined</h5>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                This runbook doesn't have any executable steps yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RunbookViewer;
