import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function EditBlockModal({ show, onHide, block, onSave }) {
  const [config, setConfig] = useState({});
  const [name, setName] = useState('');

  useEffect(() => {
    if (block) {
      setConfig(block.config);
      setName(block.name || '');
    }
  }, [block]);

  const handleSave = () => {
    onSave(block.id, config, name);
    onHide();
  };

  const renderForm = () => {
    if (!block) return null;

    switch (block.type) {
      case 'instruction':
        return (
          <Form.Group controlId="text">
            <Form.Label>Instruction Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={config.text || ''}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
            />
          </Form.Group>
        );
      case 'command':
        return (
          <Form.Group controlId="command">
            <Form.Label>Command</Form.Label>
            <Form.Control
              type="text"
              value={config.command || ''}
              onChange={(e) =>
                setConfig({ ...config, command: e.target.value })
              }
            />
          </Form.Group>
        );
      case 'api':
        return (
          <>
            <Form.Group controlId="method">
              <Form.Label>Method</Form.Label>
              <Form.Control
                as="select"
                value={config.method || 'GET'}
                onChange={(e) =>
                  setConfig({ ...config, method: e.target.value })
                }
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="url" className="mt-3">
              <Form.Label>URL</Form.Label>
              <Form.Control
                type="text"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
              />
            </Form.Group>
          </>
        );
      default:
        return <p>No editable fields for this block type.</p>;
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Edit {block?.type} Block</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId="blockName">
          <Form.Label>Block Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Group>
        <hr />
        {renderForm()}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditBlockModal;
