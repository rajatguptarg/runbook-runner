import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  getRunbookDetails,
  updateRunbook,
  getCredentials,
  getEnvironments,
} from '../services/api';
import Block from '../components/Block';
import EditBlockModal from '../components/EditBlockModal';
import { v4 as uuidv4 } from 'uuid';

function RunbookEditor() {
  const { id: runbookId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tags, setTags] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [runbookRes, credentialsRes, environmentsRes] = await Promise.all([
          getRunbookDetails(runbookId),
          getCredentials(),
          getEnvironments(),
        ]);
        setTitle(runbookRes.data.title);
        setDescription(runbookRes.data.description);
        setBlocks(runbookRes.data.blocks);
        setTags(runbookRes.data.tags || []);
        setEnvironmentId(runbookRes.data.environment_id || '');
        setCredentials(credentialsRes.data);
        setEnvironments(environmentsRes.data);
      } catch (err) {
        setError('Failed to fetch initial runbook data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [runbookId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const runbookData = {
        title,
        description,
        blocks,
        tags,
        environment_id: environmentId || null,
      };
      await updateRunbook(runbookId, runbookData);
      navigate('/');
    } catch (err) {
      setError('Failed to save runbook.');
      console.error(err);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedBlocks = items.map((block, index) => ({ ...block, order: index + 1 }));
    setBlocks(updatedBlocks);
  };

  const addBlock = (type) => {
    const newBlock = {
      id: uuidv4(),
      type: type,
      name: `New ${type} block`,
      config: {},
      order: blocks.length + 1,
    };
    setBlocks([...blocks, newBlock]);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter((block) => block.id !== id));
  };

  const openModal = (block) => {
    setEditingBlock(block);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingBlock(null);
    setShowModal(false);
  };

  const saveBlock = (id, newConfig, name) => {
    setBlocks(
      blocks.map((block) =>
        block.id === id ? { ...block, config: newConfig, name: name } : block
      )
    );
  };

  const addNestedBlock = (parentBlockId, blockType, path = 'nested_blocks') => {
    const newNestedBlock = {
      id: uuidv4(),
      type: blockType,
      name: `New ${blockType} block`,
      config: {},
      order: 1,
    };

    setBlocks(
      blocks.map((block) => {
        if (block.id === parentBlockId) {
          const currentBlocks = block.config[path] || [];
          return {
            ...block,
            config: {
              ...block.config,
              [path]: [...currentBlocks, newNestedBlock]
            }
          };
        }
        return block;
      })
    );
  };

  const editNestedBlock = (parentBlockId, nestedBlock, path = 'nested_blocks') => {
    setEditingBlock({
      ...nestedBlock,
      parentBlockId: parentBlockId,
      path: path
    });
    setShowModal(true);
  };

  const deleteNestedBlock = (parentBlockId, nestedBlockId) => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === parentBlockId) {
          // Check nested_blocks
          if ((block.config.nested_blocks || []).some(b => b.id === nestedBlockId)) {
             const nestedBlocks = (block.config.nested_blocks || []).filter(
              (nestedBlock) => nestedBlock.id !== nestedBlockId
            );
            return {
              ...block,
              config: {
                ...block.config,
                nested_blocks: nestedBlocks
              }
            };
          }
          // Check else_blocks
          if ((block.config.else_blocks || []).some(b => b.id === nestedBlockId)) {
             const elseBlocks = (block.config.else_blocks || []).filter(
              (nestedBlock) => nestedBlock.id !== nestedBlockId
            );
            return {
              ...block,
              config: {
                ...block.config,
                else_blocks: elseBlocks
              }
            };
          }
        }
        return block;
      })
    );
  };

  const saveNestedBlock = (nestedBlockId, newConfig, name, parentBlockId, path = 'nested_blocks') => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === parentBlockId) {
          // If path is provided (from EditBlockModal), use it.
          // Otherwise, we might need to search (legacy support or safety), but modal should provide it now.

          // For now, let's trust the path if provided, or search if not.
          // Actually, EditBlockModal will pass back what we gave it.

          const targetList = block.config[path] || [];
          const updatedList = targetList.map((nestedBlock) =>
            nestedBlock.id === nestedBlockId
              ? { ...nestedBlock, config: newConfig, name: name }
              : nestedBlock
          );

          return {
            ...block,
            config: {
              ...block.config,
              [path]: updatedList
            }
          };
        }
        return block;
      })
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header with hamburger menu and title */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div className="d-flex align-items-center">
          <Button
            variant="link"
            style={{ padding: '0', border: 'none', marginRight: '1rem' }}
            onClick={() => navigate('/')}
          >
            <i className="bi bi-list" style={{ fontSize: '1.5rem', color: '#6c757d' }}></i>
          </Button>
          <h4 style={{ margin: 0, fontWeight: '600', color: '#2c3e50' }}>
            Editing: {title || 'Untitled Runbook'}
          </h4>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate('/')}
          style={{ borderRadius: '6px' }}
        >
          Cancel
        </Button>
      </div>

      <div className="d-flex" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Main Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          marginRight: '320px' /* Space for sidebar */
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <Form.Group controlId="runbookTitle" className="mb-3">
              <Form.Label className="h5" style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '1rem' }}>Runbook Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter runbook title"
                style={{ fontSize: '1.5rem', fontWeight: '600', color: '#2c3e50', border: 'none', padding: '0', marginBottom: '1rem' }}
              />
            </Form.Group>
            <Form.Group controlId="runbookDescription" className="mb-4">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter runbook description"
                style={{ color: '#6c757d', lineHeight: '1.6' }}
              />
            </Form.Group>

            <Form.Group controlId="environment" className="mb-4">
              <Form.Label>Execution Environment</Form.Label>
              <Form.Control
                as="select"
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
              >
                <option value="">Default (Local Execution)</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            {/* Steps Section */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="blocks">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {blocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              marginBottom: '1rem',
                              ...provided.draggableProps.style
                            }}
                          >
                            <Block
                              block={block}
                              runbookId={runbookId}
                              onDelete={() => deleteBlock(block.id)}
                              onEdit={() => openModal(block)}
                              isEditable={true}
                              onAddNestedBlock={addNestedBlock}
                              onEditNestedBlock={editNestedBlock}
                              onDeleteNestedBlock={deleteNestedBlock}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <Button
            type="submit"
            variant="primary"
            onClick={handleSave}
            style={{
              borderRadius: '8px',
              fontWeight: '500',
              padding: '10px 24px'
            }}
          >
            Save Runbook
          </Button>
        </div>

        {/* Sidebar - Add Blocks */}
        <div style={{
          position: 'fixed',
          right: 0,
          top: '80px',
          width: '320px',
          height: 'calc(100vh - 80px)',
          backgroundColor: 'white',
          borderLeft: '1px solid #e9ecef',
          padding: '2rem'
        }}>
          <h5 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '1rem' }}>
            Add Blocks
          </h5>
          <p style={{ color: '#6c757d', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Drag and drop blocks to build your runbook.
          </p>

          <div className="d-grid gap-3">
            {/* Instruction Block */}
            <div
              onClick={() => addBlock('instruction')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#e3f2fd',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-info-circle" style={{ color: '#1976d2', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>Instruction</h6>
            </div>

            {/* Command Block */}
            <div
              onClick={() => addBlock('command')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#f3e5f5',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-terminal" style={{ color: '#7b1fa2', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>Command</h6>
            </div>

            {/* SSH Block */}
            <div
              onClick={() => addBlock('ssh')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#e0f7fa',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-terminal-fill" style={{ color: '#006064', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>SSH</h6>
            </div>

            {/* Condition Block */}
            <div
              onClick={() => addBlock('condition')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#fff3e0',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-question-circle" style={{ color: '#f57c00', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>Condition</h6>
            </div>

            {/* API Block */}
            <div
              onClick={() => addBlock('api')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#fce4ec',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-cloud" style={{ color: '#c2185b', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>API</h6>
            </div>

            {/* Timer Block */}
            <div
              onClick={() => addBlock('timer')}
              style={{
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.backgroundColor = '#f8f9ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                backgroundColor: '#e8f5e8',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem'
              }}>
                <i className="bi bi-clock" style={{ color: '#388e3c', fontSize: '1.2rem' }}></i>
              </div>
              <h6 style={{ fontWeight: '600', margin: 0 }}>Timer</h6>
            </div>
          </div>
        </div>
      </div>

      <EditBlockModal
        show={showModal}
        onHide={closeModal}
        block={editingBlock}
        onSave={(id, config, name, parentBlockId, path) => {
          if (parentBlockId) {
            saveNestedBlock(id, config, name, parentBlockId, path);
          } else {
            saveBlock(id, config, name);
          }
        }}
        credentials={credentials}
      />
    </div>
  );
}

export default RunbookEditor;
