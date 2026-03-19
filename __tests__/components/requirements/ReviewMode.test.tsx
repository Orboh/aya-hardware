import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ReviewMode from '@/components/requirements/ReviewMode'
import { RequirementsDocument } from '@/types/requirements'

// Mock fetch globally
global.fetch = jest.fn()

describe('ReviewMode', () => {
  const mockDocument: RequirementsDocument = {
    id: 'req-123',
    projectId: 'project-456',
    userId: 'user-789',
    title: 'Test Requirements Document',
    content: { type: 'doc', content: [] },
    contentText: 'Test requirements content with// temperature monitoring system requirements',
    status: 'DRAFT',
    version: '1.0.0',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02')
  }

  const mockOnApprove = jest.fn()
  const mockOnReject = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render review checklist', () => {
    render(
      <ReviewMode
        document={mockDocument} sections={[]}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    expect(screen.getByText('Requirements Review Checklist')).toBeInTheDocument()
    expect(screen.getByText('Completeness Check')).toBeInTheDocument()
    expect(screen.getByText('Quality Assessment')).toBeInTheDocument()
    expect(screen.getByText('Technical Validation')).toBeInTheDocument()
    expect(screen.getByText('Business Requirements')).toBeInTheDocument()
  })

  it('should show automated check results', () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should show automated checks with pass/fail results
    expect(screen.getByText('Purpose and scope clearly defined')).toBeInTheDocument()
    expect(screen.getByText('All functional requirements specified')).toBeInTheDocument()
    expect(screen.getByText('Non-functional requirements included')).toBeInTheDocument()
  })

  it('should allow manual checklist item interaction', () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Find and click a manual checklist item
    const manualCheckbox = screen.getAllByRole('checkbox').find(checkbox =>
      !checkbox.hasAttribute('disabled')
    )

    if (manualCheckbox) {
      fireEvent.click(manualCheckbox)
      expect(manualCheckbox).toBeChecked()
    }
  })

  it('should show approval section when all critical items are checked', async () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Check all required manual items
    const manualCheckboxes = screen.getAllByRole('checkbox').filter(checkbox =>
      !checkbox.hasAttribute('disabled')
    )

    manualCheckboxes.forEach(checkbox => {
      fireEvent.click(checkbox)
    })

    await waitFor(() => {
      expect(screen.getByText('Review Decision')).toBeInTheDocument()
      expect(screen.getByText('Approve Requirements')).toBeInTheDocument()
      expect(screen.getByText('Request Changes')).toBeInTheDocument()
    })
  })

  it('should handle approval with comments', async () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Check all critical items first
    const criticalCheckboxes = screen.getAllByRole('checkbox').filter(checkbox =>
      !checkbox.hasAttribute('disabled')
    )

    criticalCheckboxes.forEach(checkbox => {
      fireEvent.click(checkbox)
    })

    await waitFor(() => {
      expect(screen.getByText('Approve Requirements')).toBeInTheDocument()
    })

    // Add approval comments
    const commentTextarea = screen.getByPlaceholderText(/Add your review comments/i)
    fireEvent.change(commentTextarea, {
      target: { value: 'Requirements are well-defined and complete.' }
    })

    // Click approve button
    fireEvent.click(screen.getByText('Approve Requirements'))

    expect(mockOnApprove).toHaveBeenCalledWith('Requirements are well-defined and complete.')
  })

  it('should handle rejection with comments', async () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should be able to reject without checking all items
    await waitFor(() => {
      expect(screen.getByText('Request Changes')).toBeInTheDocument()
    })

    // Add rejection comments
    const commentTextarea = screen.getByPlaceholderText(/Add your review comments/i)
    fireEvent.change(commentTextarea, {
      target: { value: 'Missing technical specifications and performance requirements.' }
    })

    // Click reject button
    fireEvent.click(screen.getByText('Request Changes'))

    expect(mockOnReject).toHaveBeenCalledWith('Missing technical specifications and performance requirements.')
  })

  it('should show progress indicator', () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should show progress based on checked items
    expect(screen.getByText(/Review Progress:/)).toBeInTheDocument()
  })

  it('should display automated check details', () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should show details for automated checks
    expect(screen.getByText(/Content analysis:/)).toBeInTheDocument()
    expect(screen.getByText(/Word count:/)).toBeInTheDocument()
  })

  it('should handle documents with different content types', () => {
    const documentWithSystemType = {
      ...mockDocument,
      contentText: 'IoT wireless communication system with low power requirements'
    }

    render(
      <ReviewMode
        document={documentWithSystemType}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should adapt checklist based on content
    expect(screen.getByText('Requirements Review Checklist')).toBeInTheDocument()
  })

  it('should prevent approval when critical items are not checked', () => {
    render(
      <ReviewMode
        document={mockDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Try to approve without checking critical items
    const approveButton = screen.queryByText('Approve Requirements')

    // Button should be disabled or not visible when critical items aren't checked
    if (approveButton) {
      expect(approveButton).toBeDisabled()
    }
  })

  it('should show validation warnings for incomplete content', () => {
    const incompleteDocument = {
      ...mockDocument,
      contentText: 'Basic system'
    }

    render(
      <ReviewMode
        document={incompleteDocument}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    // Should show warnings for incomplete content
    expect(screen.getByText(/Content appears incomplete/)).toBeInTheDocument()
  })

  it('should handle missing document gracefully', () => {
    render(
      <ReviewMode
        document={null as any}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    )

    expect(screen.getByText(/No document available for review/)).toBeInTheDocument()
  })
})
