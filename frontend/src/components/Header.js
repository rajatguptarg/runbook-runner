import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const apiKey = localStorage.getItem('apiKey');

  const logoutHandler = () => {
    localStorage.removeItem('apiKey');
    navigate('/login');
  };

  return (
    <Navbar bg="white" variant="light" expand="lg" className="border-bottom" style={{ borderColor: '#e9ecef' }}>
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center" style={{ color: '#007bff', fontWeight: '600' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="me-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="currentColor"/>
            </svg>
            Runbook Studio
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link style={{ color: '#6c757d', fontWeight: '500' }}>Runbooks</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/credentials">
              <Nav.Link style={{ color: '#6c757d', fontWeight: '500' }}>Credentials</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/environments">
              <Nav.Link style={{ color: '#6c757d', fontWeight: '500' }}>Environments</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/history">
              <Nav.Link style={{ color: '#6c757d', fontWeight: '500' }}>History</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/audit">
              <Nav.Link style={{ color: '#6c757d', fontWeight: '500' }}>Audit</Nav.Link>
            </LinkContainer>
          </Nav>
          <Nav className="ms-auto d-flex align-items-center">
            <LinkContainer to="/runbooks/create">
              <Button variant="primary" size="sm" className="me-3" style={{ borderRadius: '6px' }}>
                New Runbook
              </Button>
            </LinkContainer>
            {apiKey ? (
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                  style={{ width: '32px', height: '32px', cursor: 'pointer' }}
                  onClick={logoutHandler}
                >
                  <span className="text-white" style={{ fontSize: '14px', fontWeight: '600' }}>U</span>
                </div>
              </div>
            ) : (
              <LinkContainer to="/login">
                <Nav.Link>Login</Nav.Link>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
