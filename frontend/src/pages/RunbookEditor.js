import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getRunbookDetails, updateRunbook } from '../services/api';
import Block from '../components/Block';
import EditBlockModal from '../components/EditBlockModal';
import { v4 as uuidv4 } from 'uuid';

function RunbookEditor() {
  const { id: runbookId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  useEffect(() => {
    const fetchRunbook = async () => {
      try {
        const MOCK_API_KEY = 'dev-key';
        const config = { headers: { 'X-API-KEY': MOCK_API_KEY } };
        const { data } = await getRunbookDetails(runbookId, config);
        setTitle(data.title);
        setDescription(data.description);
        setBlocks(data.blocks);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch runbook details.');
        setLoading(false);
        console.error(err);
      }
    };
    fetchRunbook();
  }, [runbookId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const MOCK_API_KEY = 'dev-key';
      const config = { headers: { 'X-API-KEY': MOCK_API_KEY } };
      const runbookData = { title, description, blocks };
      await updateRunbook(runbookId, runbookData, config);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <Link to="/" className="btn btn-light my-3">
        Go Back
      </Link>
      <Form onSubmit={handleSave}>
        <Form.Group controlId="title">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="description" className="mt-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></Form.Control>
        </Form.Group>

        <hr />

        <h2>Steps</h2>
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
                      >
                        <Block
                          block={block}
                          onDelete={() => deleteBlock(block.id)}
                          onEdit={() => openModal(block)}
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

        <Row className="mt-3">
          <Col>
            <Button variant="secondary" onClick={() => addBlock('instruction')}>
              <i className="bi bi-plus-lg me-2"></i>Instruction
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => addBlock('command')}>
              <i className="bi bi-plus-lg me-2"></i>Command
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => addBlock('api')}>
              <i className="bi bi-plus-lg me-2"></i>API Call
            </Button>
          </Col>
        </Row>

        <Button type="submit" variant="primary" className="mt-4">
          Save Runbook
        </Button>
      </Form>

      <EditBlockModal
        show={showModal}
        onHide={closeModal}
        block={editingBlock}
        onSave={saveBlock}
      />
    </>
  );
}

export default RunbookEditor;
