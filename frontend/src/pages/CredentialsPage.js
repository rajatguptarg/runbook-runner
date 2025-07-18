import React, { useState, useEffect } from 'react';
import { Table, Button, Row, Col, Modal, Form } from 'react-bootstrap';
import { getCredentials, createCredential, deleteCredential } from '../services/api';

function CredentialsPage() {
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('api');
  const [secret, setSecret] = useState('');

  const fetchCredentials = async () => {
    try {
      const { data } = await getCredentials();
      setCredentials(data);
    } catch (err) {
      setError('Failed to fetch credentials. Do you have the correct permissions?');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleShow = () => setShowModal(true);
  const handleClose = () => {
    setShowModal(false);
    setError(null);
    setName('');
    setType('api');
    setSecret('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCredential({ name, type, secret });
      handleClose();
      fetchCredentials(); // Refresh list
    } catch (err) {
      setError('Failed to create credential.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await deleteCredential(id);
        fetchCredentials(); // Refresh list
      } catch (err) {
        setError('Failed to delete credential.');
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <Row className="align-items-center mb-4">
        <Col>
          <h2 style={{ fontWeight: '600', color: '#2c3e50', margin: 0 }}>Credentials</h2>
        </Col>
        <Col className="text-end">
          <Button
            variant="primary"
            onClick={handleShow}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              padding: '8px 16px'
            }}
          >
            + New Credential
          </Button>
        </Col>
      </Row>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <Table hover responsive className="mb-0" style={{ borderCollapse: 'separate' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Name</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Type</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Created At</th>
              <th style={{
                border: 'none',
                padding: '1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                width: '120px'
              }}></th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((cred, index) => (
              <tr key={cred.id} style={{
                borderTop: index === 0 ? 'none' : '1px solid #f1f3f4'
              }}>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  {cred.name}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle'
                }}>
                  <span style={{
                    backgroundColor: cred.type === 'api' ? '#e3f2fd' : '#f3e5f5',
                    color: cred.type === 'api' ? '#1976d2' : '#7b1fa2',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {cred.type}
                  </span>
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  color: '#6c757d',
                  verticalAlign: 'middle',
                  fontSize: '0.875rem'
                }}>
                  {new Date(cred.created_at).toLocaleDateString()}
                </td>
                <td style={{
                  border: 'none',
                  padding: '1rem',
                  verticalAlign: 'middle'
                }}>
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(cred.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#dc3545',
                        padding: '6px 8px'
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid #e9ecef' }}>
          <Modal.Title style={{ fontWeight: '600', color: '#2c3e50' }}>
            Create New Credential
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {error && <div className="alert alert-danger">{error}</div>}
          <Form onSubmit={handleCreate}>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label style={{
                fontWeight: '500',
                color: '#2c3e50',
                marginBottom: '0.5rem'
              }}>
                Credential Name
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Production API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  padding: '12px',
                  fontSize: '0.95rem'
                }}
              />
            </Form.Group>

            <Form.Group controlId="type" className="mb-3">
              <Form.Label style={{
                fontWeight: '500',
                color: '#2c3e50',
                marginBottom: '0.5rem'
              }}>
                Credential Type
              </Form.Label>
              <Form.Control
                as="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  padding: '12px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="api">API Key</option>
                <option value="ssh">SSH Key</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="secret" className="mb-3">
              <Form.Label style={{
                fontWeight: '500',
                color: '#2c3e50',
                marginBottom: '0.5rem'
              }}>
                Secret Value
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder={type === 'api' ? 'Enter your API key...' : 'Paste your SSH private key...'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
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
                This will be encrypted and stored securely.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                onClick={handleClose}
                className="me-2"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '10px 20px'
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '10px 20px'
                }}
              >
                Save Credential
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CredentialsPage;
