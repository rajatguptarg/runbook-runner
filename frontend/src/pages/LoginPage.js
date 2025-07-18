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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '3rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e9ecef'
      }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="me-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#007bff" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="#007bff"/>
            </svg>
            <h3 style={{
              fontWeight: '700',
              color: '#007bff',
              margin: 0
            }}>
              Runbook Studio
            </h3>
          </div>
          <p style={{
            color: '#6c757d',
            fontSize: '0.95rem',
            margin: 0
          }}>
            Sign in to your account to continue
          </p>
        </div>

        <Tab.Container defaultActiveKey="login">
          {/* Tab Navigation */}
          <Nav
            variant="pills"
            className="justify-content-center mb-4"
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '4px'
            }}
          >
            <Nav.Item style={{ flex: 1 }}>
              <Nav.Link
                eventKey="login"
                style={{
                  borderRadius: '6px',
                  fontWeight: '500',
                  textAlign: 'center',
                  border: 'none',
                  color: '#6c757d'
                }}
              >
                Login
              </Nav.Link>
            </Nav.Item>
            <Nav.Item style={{ flex: 1 }}>
              <Nav.Link
                eventKey="signup"
                style={{
                  borderRadius: '6px',
                  fontWeight: '500',
                  textAlign: 'center',
                  border: 'none',
                  color: '#6c757d'
                }}
              >
                Sign Up
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {error && (
            <div
              className="alert alert-danger"
              style={{
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                marginBottom: '1.5rem'
              }}
            >
              {error}
            </div>
          )}

          <Tab.Content>
            <Tab.Pane eventKey="login">
              <Form onSubmit={handleLogin}>
                <Form.Group controlId="username" className="mb-3">
                  <Form.Label style={{
                    fontWeight: '500',
                    color: '#2c3e50',
                    marginBottom: '0.5rem'
                  }}>
                    Username
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="password" className="mb-4">
                  <Form.Label style={{
                    fontWeight: '500',
                    color: '#2c3e50',
                    marginBottom: '0.5rem'
                  }}>
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    fontWeight: '500',
                    padding: '12px',
                    fontSize: '0.95rem'
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Form>
            </Tab.Pane>

            <Tab.Pane eventKey="signup">
              <Form onSubmit={handleSignup}>
                <Form.Group controlId="newUsername" className="mb-3">
                  <Form.Label style={{
                    fontWeight: '500',
                    color: '#2c3e50',
                    marginBottom: '0.5rem'
                  }}>
                    Username
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="newPassword" className="mb-3">
                  <Form.Label style={{
                    fontWeight: '500',
                    color: '#2c3e50',
                    marginBottom: '0.5rem'
                  }}>
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="role" className="mb-4">
                  <Form.Label style={{
                    fontWeight: '500',
                    color: '#2c3e50',
                    marginBottom: '0.5rem'
                  }}>
                    Role
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="developer">Developer</option>
                    <option value="sre">SRE</option>
                  </Form.Control>
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    fontWeight: '500',
                    padding: '12px',
                    fontSize: '0.95rem'
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>
    </div>
  );
}

export default LoginPage;
