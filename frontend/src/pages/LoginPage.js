import React, { useState } from 'react';
import { Form, Button, Row, Col, Tab, Nav, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { signup, login } from '../services/api';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('developer');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await login({ username, password });
      localStorage.setItem('apiKey', data.api_key);
      navigate('/');
    } catch (err) {
      if (err.response) {
        setError(`Login Failed: ${err.response.data.detail || err.response.statusText}`);
      } else if (err.request) {
        setError('Login Failed: No response from server. Is it running?');
      } else {
        setError(`Login Failed: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await signup({ username, password, role });
      localStorage.setItem('apiKey', data.api_key);
      navigate('/');
    } catch (err) {
      if (err.response) {
        setError(`Signup Failed: ${err.response.data.detail || err.response.statusText}`);
      } else if (err.request) {
        setError('Signup Failed: No response from server. Is it running?');
      } else {
        setError(`Signup Failed: ${err.message}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-md-center">
      <Col xs={12} md={6}>
        <Tab.Container defaultActiveKey="login">
          <Nav variant="pills" className="justify-content-center mb-3">
            <Nav.Item>
              <Nav.Link eventKey="login">Login</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="signup">Sign Up</Nav.Link>
            </Nav.Item>
          </Nav>
          {error && <div className="alert alert-danger">{error}</div>}
          <Tab.Content>
            <Tab.Pane eventKey="login">
              <Form onSubmit={handleLogin}>
                <Form.Group controlId="username">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                <Form.Group controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                <Button type="submit" variant="primary" className="mt-3" disabled={loading}>
                  {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Login'}
                </Button>
              </Form>
            </Tab.Pane>
            <Tab.Pane eventKey="signup">
              <Form onSubmit={handleSignup}>
                <Form.Group controlId="newUsername">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                <Form.Group controlId="newPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                <Form.Group controlId="role">
                  <Form.Label>Role</Form.Label>
                  <Form.Control
                    as="select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                  >
                    <option value="developer">Developer</option>
                    <option value="sre">SRE</option>
                  </Form.Control>
                </Form.Group>
                <Button type="submit" variant="primary" className="mt-3" disabled={loading}>
                  {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Sign Up'}
                </Button>
              </Form>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Col>
    </Row>
  );
}

export default LoginPage;
