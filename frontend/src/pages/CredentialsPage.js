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
    <>
      <Row className="align-items-center">
        <Col>
          <h1>Credentials</h1>
        </Col>
        <Col className="text-end">
          <Button className="my-3" onClick={handleShow}>
            <i className="bi bi-plus-lg me-2"></i>Create Credential
          </Button>
        </Col>
      </Row>
      {error && <div className="alert alert-danger">{error}</div>}
      <Table striped bordered hover responsive className="table-sm">
        <thead>
          <tr>
            <th>NAME</th>
            <th>TYPE</th>
            <th>CREATED AT</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred) => (
            <tr key={cred.id}>
              <td>{cred.name}</td>
              <td>{cred.type}</td>
              <td>{new Date(cred.created_at).toLocaleString()}</td>
              <td>
                <Button
                  variant="danger"
                  className="btn-sm"
                  onClick={() => handleDelete(cred.id)}
                >
                  <i className="bi bi-trash-fill"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create Credential</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Form onSubmit={handleCreate}>
            <Form.Group controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="type" className="mt-3">
              <Form.Label>Type</Form.Label>
              <Form.Control
                as="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="api">API Key</option>
                <option value="ssh">SSH Key</option>
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="secret" className="mt-3">
              <Form.Label>Secret</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="mt-3">
              Save
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default CredentialsPage;
