import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function EditBlockModal({ show, onHide, block, onSave, credentials }) {
  const [config, setConfig] = useState({});
  const [name, setName] = useState('');

  useEffect(() => {
    if (block) {
      setConfig(block.config);
      setName(block.name || '');
    }
  }, [block]);

  const handleSave = () => {
    if (block.parentBlockId) {
      // This is a nested block
      onSave(block.id, config, name, block.parentBlockId);
    } else {
      // This is a regular block
      onSave(block.id, config, name);
    }
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
            <hr />
            <h5>Authentication</h5>
            <Form.Group controlId="credential">
              <Form.Label>Credential</Form.Label>
              <Form.Control
                as="select"
                value={config.credential_id || ''}
                onChange={(e) =>
                  setConfig({ ...config, credential_id: e.target.value })
                }
              >
                <option value="">None</option>
                {credentials?.map((cred) => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="authHeaderName" className="mt-3">
              <Form.Label>Header Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Authorization"
                value={config.auth_header_name || ''}
                onChange={(e) =>
                  setConfig({ ...config, auth_header_name: e.target.value })
                }
              />
            </Form.Group>
          </>
        );
      case 'condition':
        return (
          <>
            <Form.Group controlId="conditionType">
              <Form.Label>Condition Type</Form.Label>
              <Form.Control
                as="select"
                value={config.condition_type || 'command_exit_code'}
                onChange={(e) =>
                  setConfig({ ...config, condition_type: e.target.value })
                }
              >
                <option value="command_exit_code">Command Exit Code</option>
                <option value="api_status_code">API Response Status</option>
                <option value="file_exists">File Exists</option>
                <option value="env_var_equals">Environment Variable Equals</option>
              </Form.Control>
            </Form.Group>

            {config.condition_type === 'command_exit_code' && (
              <>
                <Form.Group controlId="checkCommand" className="mt-3">
                  <Form.Label>Command to Check</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="echo 'hello world'"
                    value={config.check_command || ''}
                    onChange={(e) =>
                      setConfig({ ...config, check_command: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group controlId="expectedExitCode" className="mt-3">
                  <Form.Label>Expected Exit Code</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={config.expected_exit_code || 0}
                    onChange={(e) =>
                      setConfig({ ...config, expected_exit_code: parseInt(e.target.value) })
                    }
                  />
                </Form.Group>
              </>
            )}

            {config.condition_type === 'api_status_code' && (
              <>
                <Form.Group controlId="checkUrl" className="mt-3">
                  <Form.Label>URL to Check</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="https://api.example.com/health"
                    value={config.check_url || ''}
                    onChange={(e) =>
                      setConfig({ ...config, check_url: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group controlId="expectedStatusCode" className="mt-3">
                  <Form.Label>Expected Status Code</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="200"
                    value={config.expected_status_code || 200}
                    onChange={(e) =>
                      setConfig({ ...config, expected_status_code: parseInt(e.target.value) })
                    }
                  />
                </Form.Group>
              </>
            )}

            {config.condition_type === 'file_exists' && (
              <Form.Group controlId="filePath" className="mt-3">
                <Form.Label>File Path</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="/path/to/file"
                  value={config.file_path || ''}
                  onChange={(e) =>
                    setConfig({ ...config, file_path: e.target.value })
                  }
                />
              </Form.Group>
            )}

            {config.condition_type === 'env_var_equals' && (
              <>
                <Form.Group controlId="envVarName" className="mt-3">
                  <Form.Label>Environment Variable Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="NODE_ENV"
                    value={config.env_var_name || ''}
                    onChange={(e) =>
                      setConfig({ ...config, env_var_name: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group controlId="envVarValue" className="mt-3">
                  <Form.Label>Expected Value</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="production"
                    value={config.env_var_value || ''}
                    onChange={(e) =>
                      setConfig({ ...config, env_var_value: e.target.value })
                    }
                  />
                </Form.Group>
              </>
            )}

            <hr />
            <p style={{ color: '#6c757d', fontSize: '0.875rem', marginBottom: 0 }}>
              <i className="bi bi-info-circle me-2"></i>
              Nested blocks will be executed only if this condition evaluates to true.
              You can add command, API, and instruction blocks inside this condition block after saving.
            </p>
          </>
        );
      case 'timer':
        return (
          <Form.Group controlId="duration">
            <Form.Label>Duration (seconds)</Form.Label>
            <Form.Control
              type="number"
              placeholder="30"
              value={config.duration || ''}
              onChange={(e) =>
                setConfig({ ...config, duration: parseInt(e.target.value) })
              }
            />
          </Form.Group>
        );
      case 'ssh':
        return (
          <>
            <Form.Group controlId="host">
              <Form.Label>Host</Form.Label>
              <Form.Control
                type="text"
                placeholder="example.com"
                value={config.host || ''}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
              />
            </Form.Group>
            <Form.Group controlId="username" className="mt-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="user"
                value={config.username || ''}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
              />
            </Form.Group>
            <Form.Group controlId="credential" className="mt-3">
              <Form.Label>Credential (SSH Key)</Form.Label>
              <Form.Control
                as="select"
                value={config.credential_id || ''}
                onChange={(e) =>
                  setConfig({ ...config, credential_id: e.target.value })
                }
              >
                <option value="">None</option>
                {credentials?.filter(c => c.type === 'ssh').map((cred) => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="command" className="mt-3">
              <Form.Label>Command</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="ls -la"
                value={config.command || ''}
                onChange={(e) => setConfig({ ...config, command: e.target.value })}
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
