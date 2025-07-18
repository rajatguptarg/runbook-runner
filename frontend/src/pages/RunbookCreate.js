import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { createRunbook } from '../services/api';

function RunbookCreate() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const runbookData = {
        title,
        description,
        tags,
        blocks: [], // Start with an empty runbook
      };
      await createRunbook(runbookData);
      navigate('/');
    } catch (err) {
      setError('Failed to create runbook.');
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '3rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e9ecef'
      }}>
        <div className="text-center mb-4">
          <h2 style={{
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '0.5rem'
          }}>
            Create a New Runbook
          </h2>
          <p style={{
            color: '#6c757d',
            fontSize: '0.95rem',
            margin: 0
          }}>
            Start building your automated workflow by adding a title and content.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="title" className="mb-3">
            <Form.Label style={{
              fontWeight: '500',
              color: '#2c3e50',
              marginBottom: '0.5rem'
            }}>
              Runbook Title
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Server Reboot Procedure"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                padding: '12px',
                fontSize: '0.95rem'
              }}
            />
          </Form.Group>

          <Form.Group controlId="description" className="mb-3">
            <Form.Label style={{
              fontWeight: '500',
              color: '#2c3e50',
              marginBottom: '0.5rem'
            }}>
              Content
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              placeholder={`Write your runbook content here.
Use markdown for formatting.
For example:
### Step 1: Connect to the server
ssh user@server_ip`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                padding: '12px',
                fontSize: '0.95rem',
                fontFamily: 'monospace',
                lineHeight: '1.5'
              }}
            />
            <Form.Text style={{ color: '#6c757d', fontSize: '0.875rem' }}>
              Markdown is supported for easy formatting.
            </Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button
              type="submit"
              variant="primary"
              style={{
                borderRadius: '8px',
                fontWeight: '500',
                padding: '10px 24px',
                fontSize: '0.95rem'
              }}
            >
              Create Runbook
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default RunbookCreate;
