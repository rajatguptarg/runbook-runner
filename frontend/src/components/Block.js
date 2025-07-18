import React from 'react';
import { Card, Button, Row, Col } from 'react-bootstrap';

const InstructionBlock = ({ block }) => (
  <Card.Body>
    <Card.Text>{block.config.text || 'No instruction text yet.'}</Card.Text>
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
      <strong>{block.config.method || 'GET'}</strong> {block.config.url || 'http://...'}
    </Card.Text>
  </Card.Body>
);

const Block = ({ block, onDelete, onEdit }) => {
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
            <i className={`bi bi-${block.type === 'instruction' ? 'info-circle' : 'terminal'} me-2`}></i>
            {block.name || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
          </Col>
          <Col className="text-end">
            <Button variant="light" className="btn-sm mx-1" onClick={onEdit}>
              <i className="bi bi-pencil-fill"></i>
            </Button>
            <Button variant="danger" className="btn-sm mx-1" onClick={onDelete}>
              <i className="bi bi-trash-fill"></i>
            </Button>
            <Button variant="light" className="btn-sm ms-2">
              <i className="bi bi-grip-vertical"></i>
            </Button>
          </Col>
        </Row>
      </Card.Header>
      {renderBlockContent()}
    </Card>
  );
};

export default Block;
