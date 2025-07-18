import React, { useState } from 'react';
import { Card, Button, Row, Col, Spinner, Badge, Dropdown } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { executeBlock } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const StatusBadge = ({ status }) => {
  let variant;
  switch (status) {
    case 'success':
      variant = 'success';
      break;
    case 'running':
      variant = 'primary';
      break;
    case 'error':
      variant = 'danger';
      break;
    default:
      variant = 'secondary';
  }
  return <Badge bg={variant}>{status.toUpperCase()}</Badge>;
};

const InstructionBlock = ({ block }) => (
  <Card.Body>
    <ReactMarkdown>{block.config.text || 'No instruction text yet.'}</ReactMarkdown>
  </Card.Body>
);

const CommandBlock = ({ block }) => (
  <Card.Body>
    <Card.Text as="pre" className="bg-dark text-white p-2 rounded">
      <code>$ {block.config.command || '# No command yet'}</code>
    </Card.Text>
  </Card.Body>
);

const ApiBlock = ({ block }) => (
  <Card.Body>
    <Card.Text as="pre" className="bg-light p-2 rounded">
      <strong>{block.config.method || 'GET'}</strong>{' '}
      {block.config.url || 'http://...'}
    </Card.Text>
  </Card.Body>
);

const ConditionBlock = ({ block, runbookId, onAddNestedBlock, onEditNestedBlock, onDeleteNestedBlock, isEditable, conditionResult }) => {
  const getConditionDescription = () => {
    switch (block.config.condition_type) {
      case 'command_exit_code':
        return `Command "${block.config.check_command}" exits with code ${block.config.expected_exit_code}`;
      case 'api_status_code':
        return `API call to "${block.config.check_url}" returns status ${block.config.expected_status_code}`;
      case 'file_exists':
        return `File exists: ${block.config.file_path}`;
      case 'env_var_equals':
        return `Environment variable ${block.config.env_var_name} equals "${block.config.env_var_value}"`;
      default:
        return 'Condition not configured';
    }
  };

  return (
    <Card.Body>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          backgroundColor: conditionResult
            ? (conditionResult.condition_met ? '#d4edda' : '#f8d7da')
            : '#fff3cd',
          border: `1px solid ${conditionResult
            ? (conditionResult.condition_met ? '#c3e6cb' : '#f5c6cb')
            : '#ffeaa7'}`,
          borderRadius: '4px',
          padding: '0.75rem',
          marginBottom: '1rem'
        }}>
          <strong>Condition:</strong> {getConditionDescription()}
          {conditionResult && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              <strong>Status:</strong> {conditionResult.condition_met ? '✅ TRUE' : '❌ FALSE'}
            </div>
          )}
        </div>

        {/* Nested Blocks */}
        <div style={{ marginLeft: '1rem', borderLeft: '3px solid #dee2e6', paddingLeft: '1rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 style={{ margin: 0, color: '#6c757d' }}>Execute if condition is true:</h6>
            {isEditable && (
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-plus"></i> Add Block
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => onAddNestedBlock(block.id, 'instruction')}>
                    <i className="bi bi-info-circle me-2"></i>Instruction
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => onAddNestedBlock(block.id, 'command')}>
                    <i className="bi bi-terminal me-2"></i>Command
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => onAddNestedBlock(block.id, 'api')}>
                    <i className="bi bi-cloud me-2"></i>API Call
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>

          {block.config.nested_blocks && block.config.nested_blocks.length > 0 ? (
            block.config.nested_blocks.map((nestedBlock, index) => (
              <div key={nestedBlock.id} style={{ marginBottom: '0.5rem' }}>
                <Block
                  block={nestedBlock}
                  runbookId={runbookId}
                  onDelete={() => onDeleteNestedBlock(block.id, nestedBlock.id)}
                  onEdit={() => onEditNestedBlock(block.id, nestedBlock)}
                  isEditable={isEditable}
                  isNested={true}
                  isDisabled={!conditionResult || !conditionResult.condition_met}
                />
              </div>
            ))
          ) : (
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '4px',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              <i className="bi bi-inbox" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                No nested blocks. Add blocks to execute when the condition is true.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card.Body>
  );
};

const TimerBlock = ({ block }) => (
  <Card.Body>
    <Card.Text>
      <i className="bi bi-clock me-2"></i>
      Wait for {block.config.duration || 0} seconds
    </Card.Text>
  </Card.Body>
);

const Block = ({
  block,
  runbookId,
  onDelete,
  onEdit,
  isEditable = false,
  isNested = false,
  isDisabled = false,
  onAddNestedBlock,
  onEditNestedBlock,
  onDeleteNestedBlock
}) => {
  const [executionResult, setExecutionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRun = async () => {
    setIsLoading(true);
    setExecutionResult(null);
    try {
      console.log('Regular block execution - sending:', JSON.stringify(block, null, 2)); // Debug log
      const { data } = await executeBlock(block, runbookId);
      setExecutionResult(data);
    } catch (err) {
      let outputMessage;
      const detail = err.response?.data?.detail;

      if (detail) {
        outputMessage =
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail, null, 2);
      } else {
        outputMessage = 'Failed to execute block. Check API logs.';
      }

      setExecutionResult({
        status: 'error',
        output: String(outputMessage), // Ensure it's always a string
        exit_code: -1,
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleRunCondition = async () => {
    setIsLoading(true);
    setExecutionResult(null);
    try {
      let conditionMet = false;
      let conditionOutput = '';

      // Execute the condition check using backend
      switch (block.config.condition_type) {
        case 'command_exit_code':
          try {
            const conditionBlock = {
              id: uuidv4(),
              type: 'command',
              name: 'Condition Check',
              config: { command: block.config.check_command },
              order: 1
            };
            const result = await executeBlock(conditionBlock, runbookId);
            const exitCode = result.data.exit_code ?? (result.data.status === 'success' ? 0 : 1);
            const expectedExitCode = parseInt(block.config.expected_exit_code ?? 0);
            conditionMet = exitCode === expectedExitCode;
            conditionOutput = `Command "${block.config.check_command}" returned exit code ${exitCode} (expected ${expectedExitCode})`;
          } catch (err) {
            conditionMet = false;
            conditionOutput = `Command "${block.config.check_command}" failed to execute`;
          }
          break;

        case 'api_status_code':
          try {
            const conditionBlock = {
              id: uuidv4(),
              type: 'api',
              name: 'API Condition Check',
              config: {
                method: 'GET',
                url: block.config.check_url
              },
              order: 1
            };
            const result = await executeBlock(conditionBlock, runbookId);
            const statusCode = result.data.status_code ?? result.data.response?.status;
            const expectedStatusCode = parseInt(block.config.expected_status_code ?? 200);
            conditionMet = statusCode === expectedStatusCode;
            conditionOutput = `API call to "${block.config.check_url}" returned status ${statusCode} (expected ${expectedStatusCode})`;
          } catch (err) {
            conditionMet = false;
            conditionOutput = `API call to "${block.config.check_url}" failed`;
          }
          break;

        case 'file_exists':
          try {
            const conditionBlock = {
              id: uuidv4(),
              type: 'command',
              name: 'File Check',
              config: { command: `test -f "${block.config.file_path}"` },
              order: 1
            };
            const result = await executeBlock(conditionBlock, runbookId);
            const exitCode = result.data.exit_code ?? (result.data.status === 'success' ? 0 : 1);
            conditionMet = exitCode === 0;
            conditionOutput = `File "${block.config.file_path}" ${conditionMet ? 'exists' : 'does not exist'}`;
          } catch (err) {
            conditionMet = false;
            conditionOutput = `Failed to check if file "${block.config.file_path}" exists`;
          }
          break;

        case 'env_var_equals':
          try {
            const conditionBlock = {
              id: uuidv4(),
              type: 'command',
              name: 'Environment Variable Check',
              config: { command: `echo $${block.config.env_var_name}` },
              order: 1
            };
            const result = await executeBlock(conditionBlock, runbookId);
            const actualValue = (result.data.output || '').trim();
            const expectedValue = block.config.env_var_value || '';
            conditionMet = actualValue === expectedValue;
            conditionOutput = `Environment variable ${block.config.env_var_name}="${actualValue}" (expected "${expectedValue}")`;
          } catch (err) {
            conditionMet = false;
            conditionOutput = `Failed to check environment variable ${block.config.env_var_name}`;
          }
          break;

        default:
          conditionMet = false;
          conditionOutput = 'Unknown condition type';
      }

      // If condition is met, execute nested blocks
      const nestedResults = [];
      if (conditionMet && block.config.nested_blocks) {
        for (const nestedBlock of block.config.nested_blocks) {
          try {
            const result = await executeBlock(nestedBlock, runbookId);
            nestedResults.push({
              blockId: nestedBlock.id,
              blockName: nestedBlock.name,
              status: 'success',
              output: String(result.data.output || '')
            });
          } catch (nestedErr) {
            const errorOutput = nestedErr.response?.data?.detail;
            nestedResults.push({
              blockId: nestedBlock.id,
              blockName: nestedBlock.name,
              status: 'error',
              output: typeof errorOutput === 'string' ? errorOutput : JSON.stringify(errorOutput) || 'Execution failed'
            });
          }
        }
      }

      setExecutionResult({
        status: 'success',
        output: conditionMet
          ? `${conditionOutput} - Condition TRUE. Executed ${nestedResults.length} nested blocks.`
          : `${conditionOutput} - Condition FALSE. Nested blocks skipped.`,
        condition_met: conditionMet,
        nested_results: nestedResults
      });

    } catch (err) {
      console.error('Condition execution error:', err);
      setExecutionResult({
        status: 'error',
        output: 'Failed to execute condition block',
        condition_met: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'instruction':
        return <InstructionBlock block={block} />;
      case 'command':
        return <CommandBlock block={block} />;
      case 'api':
        return <ApiBlock block={block} />;
      case 'condition':
        return (
          <ConditionBlock
            block={block}
            runbookId={runbookId}
            onAddNestedBlock={onAddNestedBlock}
            onEditNestedBlock={onEditNestedBlock}
            onDeleteNestedBlock={onDeleteNestedBlock}
            isEditable={isEditable}
            conditionResult={executionResult}
          />
        );
      case 'timer':
        return <TimerBlock block={block} />;
      default:
        return <Card.Body>Unsupported block type: {block.type}</Card.Body>;
    }
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case 'instruction': return 'info-circle';
      case 'command': return 'terminal';
      case 'api': return 'cloud';
      case 'condition': return 'question-circle';
      case 'timer': return 'clock';
      default: return 'square';
    }
  };

  const canExecute = !['instruction'].includes(block.type);

  return (
    <Card
      className={`mb-3 ${isNested ? 'nested-block' : ''}`}
      style={{
        ...(isNested ? { marginLeft: '1rem' } : {}),
        ...(isDisabled ? { opacity: 0.6 } : {})
      }}
    >
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <i className={`bi bi-${getBlockIcon()} me-2`}></i>
            {block.name ||
              `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
          </Col>
          <Col className="text-end">
            {canExecute && (
              <Button
                variant="primary"
                className="btn-sm mx-1"
                onClick={block.type === 'condition' ? handleRunCondition : handleRun}
                disabled={isLoading || isDisabled}
                title={isDisabled ? "Condition must be true to execute this block" : ""}
              >
                {isLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <i className={`bi bi-${block.type === 'condition' ? 'check-circle' : 'play-fill'}`}></i>
                )}
              </Button>
            )}
            {isEditable && (
              <>
                <Button variant="light" className="btn-sm mx-1" onClick={onEdit}>
                  <i className="bi bi-pencil-fill"></i>
                </Button>
                <Button
                  variant="danger"
                  className="btn-sm mx-1"
                  onClick={onDelete}
                >
                  <i className="bi bi-trash-fill"></i>
                </Button>
                {!isNested && (
                  <Button variant="light" className="btn-sm ms-2">
                    <i className="bi bi-grip-vertical"></i>
                  </Button>
                )}
              </>
            )}
          </Col>
        </Row>
      </Card.Header>
      {renderBlockContent()}
      {executionResult && (
        <Card.Footer>
          <StatusBadge status={executionResult.status} />
          <pre className="bg-dark text-white p-3 rounded mt-2">
            <code>{String(executionResult.output || '')}</code>
          </pre>
          {/* Display nested block results for condition blocks */}
          {executionResult.nested_results && executionResult.nested_results.length > 0 && (
            <div className="mt-3">
              <h6>Nested Block Results:</h6>
              {executionResult.nested_results.map((result, index) => (
                <div key={index} className="mb-2">
                  <StatusBadge status={result.status} />
                  <span className="ms-2">{result.blockName || result.blockId}</span>
                  {result.output && (
                    <pre className="bg-secondary text-white p-2 rounded mt-1" style={{ fontSize: '0.75rem' }}>
                      <code>{String(result.output || '')}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card.Footer>
      )}
    </Card>
  );
};

export default Block;
