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

  const evaluateCondition = async (conditionConfig) => {
    switch (conditionConfig.condition_type) {
      case 'command_exit_code':
        try {
          const result = await executeBlock({
            id: uuidv4(),
            type: 'command',
            name: 'Condition Check',
            config: { command: conditionConfig.check_command },
            order: 1
          }, runbookId);
          console.log('Full command result:', JSON.stringify(result, null, 2)); // Debug log
          // Check for exit_code in different possible locations
          const exitCode = result.data.exit_code ?? result.data.exitCode ?? result.data.exit_status ??
                          result.exit_code ?? result.exitCode ?? result.exit_status ??
                          (result.data.status === 'success' ? 0 : 1);
          const expectedExitCode = parseInt(conditionConfig.expected_exit_code ?? 0);
          console.log('Extracted exit code:', exitCode, 'Expected:', expectedExitCode, 'Types:', typeof exitCode, typeof expectedExitCode); // Debug log
          const result_comparison = exitCode === expectedExitCode;
          console.log('Comparison result:', result_comparison); // Debug log
          return exitCode === expectedExitCode;
        } catch (err) {
          console.error('Command execution failed:', err);
          console.error('Error response:', JSON.stringify(err.response?.data, null, 2));
          return false;
        }

      case 'api_status_code':
        try {
          const result = await executeBlock({
            id: uuidv4(),
            type: 'api',
            name: 'API Condition Check',
            config: {
              method: 'GET',
              url: conditionConfig.check_url
            },
            order: 1
          }, runbookId);
          return result.data.status_code === (conditionConfig.expected_status_code || 200);
        } catch (err) {
          return false;
        }

      case 'file_exists':
        try {
          const result = await executeBlock({
            id: uuidv4(),
            type: 'command',
            name: 'File Exists Check',
            config: { command: `test -f "${conditionConfig.file_path}"` },
            order: 1
          }, runbookId);
          return result.data.exit_code === 0;
        } catch (err) {
          return false;
        }

      case 'env_var_equals':
        try {
          const result = await executeBlock({
            id: uuidv4(),
            type: 'command',
            name: 'Environment Variable Check',
            config: { command: `echo $${conditionConfig.env_var_name}` },
            order: 1
          }, runbookId);
          return result.data.output.trim() === conditionConfig.env_var_value;
        } catch (err) {
          return false;
        }

      default:
        return false;
    }
  };

  const handleRunCondition = async () => {
    setIsLoading(true);
    setExecutionResult(null);
    try {
      // Evaluate the condition using frontend logic
      const conditionMet = await evaluateCondition(block.config);

      if (conditionMet) {
        // If condition is true, execute nested blocks
        const nestedResults = [];
        for (const nestedBlock of block.config.nested_blocks || []) {
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

        setExecutionResult({
          status: 'success',
          output: `Condition evaluated to TRUE. Executed ${nestedResults.length} nested blocks.`,
          condition_met: true,
          nested_results: nestedResults
        });
      } else {
        setExecutionResult({
          status: 'success',
          output: 'Condition evaluated to FALSE. Nested blocks were skipped.',
          condition_met: false,
          nested_results: []
        });
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      setExecutionResult({
        status: 'error',
        output: typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail) || 'Failed to evaluate condition',
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
