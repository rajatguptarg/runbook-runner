import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Block from '../Block';
import { executeBlock } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');

describe('Block Component', () => {
  const mockRunbookId = 'test-runbook-id';
  const mockOnAddNestedBlock = jest.fn();
  const mockOnEditNestedBlock = jest.fn();
  const mockOnDeleteNestedBlock = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders instruction block', () => {
    const block = {
      id: '1',
      type: 'instruction',
      name: 'Test Instruction',
      config: { text: 'Some instructions' },
    };

    render(<Block block={block} />);
    expect(screen.getByText('Test Instruction')).toBeInTheDocument();
    expect(screen.getByText('Some instructions')).toBeInTheDocument();
  });

  test('renders command block', () => {
    const block = {
      id: '2',
      type: 'command',
      name: 'Test Command',
      config: { command: 'ls -la' },
    };

    render(<Block block={block} />);
    expect(screen.getByText('Test Command')).toBeInTheDocument();
    expect(screen.getByText('$ ls -la')).toBeInTheDocument();
  });

  test('executes command block on button click', async () => {
    const block = {
      id: '2',
      type: 'command',
      name: 'Test Command',
      config: { command: 'ls -la' },
    };

    executeBlock.mockResolvedValue({
      data: {
        status: 'success',
        output: 'file1.txt\nfile2.txt',
        exit_code: 0,
      },
    });

    render(<Block block={block} runbookId={mockRunbookId} />);
    
    const runButton = screen.getByRole('button', { name: '' }); // It has an icon, so empty name or query by icon class
    // Better to query by role and verify it's the run button if there are multiple. 
    // The run button has class 'btn-primary'.
    // Or query by the icon class within it.
    
    // In the code: <i className={`bi bi-${block.type === 'condition' ? 'check-circle' : 'play-fill'}`}></i>
    // So for command it is play-fill
    
    // Let's just find the button containing the icon
    const button = document.querySelector('.bi-play-fill').closest('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(executeBlock).toHaveBeenCalledWith(block, mockRunbookId);
      expect(screen.getByText('file1.txt')).toBeInTheDocument();
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    });
  });

  test('renders condition block with True and Else sections', () => {
    const block = {
      id: '3',
      type: 'condition',
      name: 'Test Condition',
      config: {
        condition_type: 'command_exit_code',
        check_command: 'exit 0',
        expected_exit_code: 0,
        nested_blocks: [],
        else_blocks: []
      },
    };

    render(
      <Block 
        block={block} 
        runbookId={mockRunbookId} 
        isEditable={true}
        onAddNestedBlock={mockOnAddNestedBlock}
      />
    );

    expect(screen.getByText('Test Condition')).toBeInTheDocument();
    expect(screen.getByText(/If True:/i)).toBeInTheDocument();
    expect(screen.getByText(/Else (If False):/i)).toBeInTheDocument();
    
    // Check dropdowns
    const addButtons = screen.getAllByText('Add Block');
    expect(addButtons).toHaveLength(2); // One for True, one for Else
  });

  test('executes condition block and enables execution of nested blocks', async () => {
    const block = {
      id: '3',
      type: 'condition',
      name: 'Test Condition',
      config: {
        condition_type: 'command_exit_code',
        check_command: 'exit 0',
        expected_exit_code: 0,
      },
    };

    // Mock successful execution (condition met)
    executeBlock.mockResolvedValue({
      data: {
        status: 'success',
        output: 'Command exit code: 0 (expected 0)',
        exit_code: 0, // 0 maps to True in our backend logic for conditions
      },
    });

    render(<Block block={block} runbookId={mockRunbookId} />);

    const button = document.querySelector('.bi-check-circle').closest('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(executeBlock).toHaveBeenCalled();
      expect(screen.getByText(/Condition TRUE/i)).toBeInTheDocument();
      expect(screen.getByText(/You can now execute nested blocks/i)).toBeInTheDocument();
    });
  });
});
