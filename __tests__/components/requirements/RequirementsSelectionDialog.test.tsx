import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RequirementsSelectionDialog from '@/components/requirements/RequirementsSelectionDialog'

// Mock fetch globally
global.fetch = jest.fn()

describe('RequirementsSelectionDialog', () => {
  const mockApprovedRequirements = [
    {
      id: 'req-1',
      title: 'Temperature Monitoring System',
      status: 'APPROVED',
      approvedAt: '2023-01-01T00:00:00Z',
      contentText: 'Temperature monitoring system requirements',
      version: 1
    },
    {
      id: 'req-2', 
      title: 'Motor Control System',
      status: 'APPROVED',
      approvedAt: '2023-01-02T00:00:00Z',
      contentText: 'Motor control system with servo actuators',
      version: 1
    },
    {
      id: 'req-3',
      title: 'IoT Communication Module',
      status: 'APPROVED', 
      approvedAt: '2023-01-03T00:00:00Z',
      contentText: 'Wireless IoT device with WiFi connectivity',
      version: 2
    }
  ]

  const mockOnSelect = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API response
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApprovedRequirements
    })
  })

  it('should render dialog when open', async () => {
    render(
      <RequirementsSelectionDialog
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    expect(screen.getByText('Select Approved Requirements')).toBeInTheDocument()
    expect(screen.getByText('Choose requirements for system suggestions')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <RequirementsSelectionDialog
        open={false}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    expect(screen.queryByText('Select Approved Requirements')).not.toBeInTheDocument()
  })

  it('should load and display approved requirements', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
      expect(screen.getByText('Motor Control System')).toBeInTheDocument()
      expect(screen.getByText('IoT Communication Module')).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith('/api/requirements/approved?projectId=project-123')
  })

  it('should allow filtering requirements by search', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Search for "temperature"
    const searchInput = screen.getByPlaceholderText('Search requirements...')
    fireEvent.change(searchInput, { target: { value: 'temperature' } })

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
      expect(screen.queryByText('Motor Control System')).not.toBeInTheDocument()
      expect(screen.queryByText('IoT Communication Module')).not.toBeInTheDocument()
    })
  })

  it('should allow selecting multiple requirements', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Select first requirement
    const checkbox1 = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox1)
    expect(checkbox1).toBeChecked()

    // Select second requirement
    const checkbox2 = screen.getAllByRole('checkbox')[1]
    fireEvent.click(checkbox2)
    expect(checkbox2).toBeChecked()
  })

  it('should handle select all functionality', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Click select all
    const selectAllButton = screen.getByText('Select All')
    fireEvent.click(selectAllButton)

    // All checkboxes should be checked
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })

  it('should handle clear all functionality', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Select some items first
    const checkbox1 = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox1)

    // Click clear all
    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)

    // All checkboxes should be unchecked
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should confirm selection with selected requirements', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Select first requirement
    const checkbox1 = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox1)

    // Click confirm button
    const confirmButton = screen.getByText('Generate System Suggestions')
    fireEvent.click(confirmButton)

    expect(mockOnSelect).toHaveBeenCalledWith(['req-1'])
  })

  it('should disable confirm button when no requirements selected', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Generate System Suggestions')
    expect(confirmButton).toBeDisabled()
  })

  it('should show selection count', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Initially should show 0 selected
    expect(screen.getByText('0 requirements selected')).toBeInTheDocument()

    // Select one requirement
    const checkbox1 = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox1)

    expect(screen.getByText('1 requirement selected')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load approved requirements')).toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    ;(fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    expect(screen.getByText('Loading requirements...')).toBeInTheDocument()
  })

  it('should display requirement details', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Should show approval dates
    expect(screen.getByText(/Approved:/)).toBeInTheDocument()
    
    // Should show versions
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('should handle close dialog', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Click cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show empty state when no approved requirements', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No approved requirements found')).toBeInTheDocument()
      expect(screen.getByText('You need approved requirements to generate system suggestions.')).toBeInTheDocument()
    })
  })

  it('should preserve selection during search', async () => {
    render(
      <RequirementsSelectionDialog
        open={true}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        projectId="project-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Temperature Monitoring System')).toBeInTheDocument()
    })

    // Select first requirement
    const checkbox1 = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox1)

    // Search to filter results
    const searchInput = screen.getByPlaceholderText('Search requirements...')
    fireEvent.change(searchInput, { target: { value: 'motor' } })

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })

    // Original selection should be preserved
    await waitFor(() => {
      const checkbox1Again = screen.getAllByRole('checkbox')[0]
      expect(checkbox1Again).toBeChecked()
    })
  })
})
