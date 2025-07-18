import React, { useState } from 'react';
import { Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { executeBlock } from '../services/api';

const StatusBadge = ({ status }) => {
  let variant;
  switch (status) {
    case 'success':
      variant = 'success';
      break;
    case 'running':
      variant = 'primary';
      break;
    case 'error':
      variant = 'danger';
      break;
    default:
      variant = 'secondary';
  }
  return <Badge bg={variant}>{status.toUpperCase()}</Badge>;
};

const InstructionBlock = ({ block }) => (
  <Card.Body>
    <ReactMarkdown>{block.config.text || 'No instruction text yet.'}</ReactMarkdown>
  </Card.Body>
);

const CommandBlock = ({ block }) => (
  <Card.Body>
    <Card.Text as="pre" className="bg-dark text-white p-2 rounded">
      <code>$ {block.config.command || '# No command yet'}</code>
    </Card.Text>
  </Card.Body>
);

const ApiBlock = ({ block }) => (
  <Card.Body>
    <Card.Text as="pre" className="bg-light p-2 rounded">
      <strong>{block.config.method || 'GET'}</strong>{' '}
      {block.config.url || 'http://...'}
    </Card.Text>
  </Card.Body>
);

const Block = ({ block, runbookId, onDelete, onEdit, isEditable = false }) => {
  const [executionResult, setExecutionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRun = async () => {
    setIsLoading(true);
    setExecutionResult(null);
    try {
      const { data } = await executeBlock(block, runbookId);
      setExecutionResult(data);
    } catch (err) {
      let outputMessage;
      const detail = err.response?.data?.detail;

      if (detail) {
        outputMessage =
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail, null, 2);
      } else {
        outputMessage = 'Failed to execute block. Check API logs.';
      }

      setExecutionResult({
        status: 'error',
        output: outputMessage,
        exit_code: -1,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'instruction':
        return <InstructionBlock block={block} />;
      case 'command':
        return <CommandBlock block={block} />;
      case 'api':
        return <ApiBlock block={block} />;
      default:
        return <Card.Body>Unsupported block type: {block.type}</Card.Body>;
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <i
              className={`bi bi-${
                block.type === 'instruction' ? 'info-circle' : 'terminal'
              } me-2`}
            ></i>
            {block.name ||
              `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
          </Col>
          <Col className="text-end">
            <Button
              variant="primary"
              className="btn-sm mx-1"
              onClick={handleRun}
              disabled={isLoading || block.type === 'instruction'}
            >
              {isLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="bi bi-play-fill"></i>
              )}
            </Button>
            {isEditable && (
              <>
                <Button variant="light" className="btn-sm mx-1" onClick={onEdit}>
                  <i className="bi bi-pencil-fill"></i>
                </Button>
                <Button
                  variant="danger"
                  className="btn-sm mx-1"
                  onClick={onDelete}
                >
                  <i className="bi bi-trash-fill"></i>
                </Button>
                <Button variant="light" className="btn-sm ms-2">
                  <i className="bi bi-grip-vertical"></i>
                </Button>
              </>
            )}
          </Col>
        </Row>
      </Card.Header>
      {renderBlockContent()}
      {executionResult && (
        <Card.Footer>
          <StatusBadge status={executionResult.status} />
          <pre className="bg-dark text-white p-3 rounded mt-2">
            <code>{executionResult.output}</code>
          </pre>
        </Card.Footer>
      )}
    </Card>
  );
};

export default Block;
