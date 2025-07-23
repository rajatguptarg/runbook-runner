import React, { useState, useEffect } from 'react';
import { Table, Button, Row, Col, Modal, Form, Spinner } from 'react-bootstrap';
import {
  getEnvironments,
  getEnvironmentDetails,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../services/api';

function EnvironmentsPage() {
  const [environments, setEnvironments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dockerfile, setDockerfile] = useState('');

  const fetchEnvironments = async () => {
    try {
      const { data } = await getEnvironments();
      setEnvironments(data);
    } catch (err) {
      setError(
        'Failed to fetch environments. Do you have the correct permissions?'
      );
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEnvironments();
  }, []);

  const handleShow = () => {
    setEditingEnv(null);
    setName('');
    setDescription('');
    setDockerfile('FROM ubuntu:latest\n\n# Add your build steps here\n');
    setShowModal(true);
  };

  const handleEditShow = async (env) => {
    try {
      const { data } = await getEnvironmentDetails(env.id);
      setEditingEnv(data);
      setName(data.name);
      setDescription(data.description);
      setDockerfile(data.dockerfile);
      setShowModal(true);
    } catch (err) {
      setError('Failed to fetch environment details.');
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setError(null);
    setEditingEnv(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const envData = { name, description, dockerfile };
      if (editingEnv && editingEnv.id) {
        await updateEnvironment(editingEnv.id, envData);
      } else {
        await createEnvironment(envData);
      }
      handleClose();
      fetchEnvironments(); // Refresh list
    } catch (err) {
      setError(
        `Failed to save environment: ${
          err.response?.data?.detail || 'Check API logs.'
        }`
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this environment?')) {
      try {
        await deleteEnvironment(id);
        fetchEnvironments(); // Refresh list
      } catch (err) {
        setError('Failed to delete environment.');
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <Row className="align-items-center mb-4">
        <Col>
          <h2 style={{ fontWeight: '600', color: '#2c3e50', margin: 0 }}>
            Execution Environments
          </h2>
        </Col>
        <Col className="text-end">
          <Button
            variant="primary"
            onClick={handleShow}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              padding: '8px 16px',
            }}
          >
            + New Environment
          </Button>
        </Col>
      </Row>

      {error && <div className="alert alert-danger">{error}</div>}

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
        }}
      >
        <Table
          hover
          responsive
          className="mb-0"
          style={{ borderCollapse: 'separate' }}
        >
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th
                style={{
                  border: 'none',
                  padding: '1rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Name
              </th>
              <th
                style={{
                  border: 'none',
                  padding: '1rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Description
              </th>
              <th
                style={{
                  border: 'none',
                  padding: '1rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Image Tag
              </th>
              <th
                style={{
                  border: 'none',
                  padding: '1rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '120px',
                }}
              ></th>
            </tr>
          </thead>
          <tbody>
            {environments.map((env, index) => (
              <tr
                key={env.id}
                style={{
                  borderTop: index === 0 ? 'none' : '1px solid #f1f3f4',
                }}
              >
                <td
                  style={{
                    border: 'none',
                    padding: '1rem',
                    verticalAlign: 'middle',
                    fontWeight: '500',
                    color: '#2c3e50',
                  }}
                >
                  {env.name}
                </td>
                <td
                  style={{
                    border: 'none',
                    padding: '1rem',
                    color: '#6c757d',
                    verticalAlign: 'middle',
                  }}
                >
                  {env.description}
                </td>
                <td
                  style={{
                    border: 'none',
                    padding: '1rem',
                    color: '#6c757d',
                    verticalAlign: 'middle',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {env.image_tag}
                </td>
                <td
                  style={{
                    border: 'none',
                    padding: '1rem',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleEditShow(env)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#6c757d',
                        padding: '6px 8px',
                      }}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(env.id)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#dc3545',
                        padding: '6px 8px',
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
            {editingEnv ? 'Edit Environment' : 'Create New Environment'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {error && <div className="alert alert-danger">{error}</div>}
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label
                style={{
                  fontWeight: '500',
                  color: '#2c3e50',
                  marginBottom: '0.5rem',
                }}
              >
                Environment Name
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Python 3.11 with AWS CLI"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  padding: '12px',
                  fontSize: '0.95rem',
                }}
              />
            </Form.Group>

            <Form.Group controlId="description" className="mb-3">
              <Form.Label
                style={{
                  fontWeight: '500',
                  color: '#2c3e50',
                  marginBottom: '0.5rem',
                }}
              >
                Description
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="A brief description of the environment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  padding: '12px',
                  fontSize: '0.95rem',
                }}
              />
            </Form.Group>

            <Form.Group controlId="dockerfile" className="mb-3">
              <Form.Label
                style={{
                  fontWeight: '500',
                  color: '#2c3e50',
                  marginBottom: '0.5rem',
                }}
              >
                Dockerfile
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                placeholder={'FROM python:3.11-slim\nRUN pip install awscli'}
                value={dockerfile}
                onChange={(e) => setDockerfile(e.target.value)}
                required
                style={{
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                }}
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                onClick={handleClose}
                className="me-2"
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '10px 20px',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                style={{
                  borderRadius: '8px',
                  fontWeight: '500',
                  padding: '10px 20px',
                }}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    {editingEnv ? 'Saving...' : 'Building...'}
                  </>
                ) : (
                  'Save and Build'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default EnvironmentsPage;
