import React from 'react';
import { Navbar, Container, Nav } from 'react-bootstrap';
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
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>
            <i className="bi bi-book-half me-2"></i>
            Runbook Studio
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Runbooks</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/credentials">
              <Nav.Link>Credentials</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/history">
              <Nav.Link>History</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/audit">
              <Nav.Link>Audit</Nav.Link>
            </LinkContainer>
          </Nav>
          <Nav className="ms-auto">
            {apiKey ? (
              <Nav.Link onClick={logoutHandler}>Logout</Nav.Link>
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
