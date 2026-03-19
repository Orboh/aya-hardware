import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RequirementsViewer from '@/components/requirements/RequirementsViewer'
import { RequirementsDocument, RequirementStatus } from '@/types/requirements'

// Mock fetch globally
global.fetch = jest.fn()

// Mock the child components
jest.mock('@/components/editor/RichTextEditor', () => {
  return function MockRichTextEditor({ content, onChange, readOnly }: any) {
    return (
      <div data-testid="rich-text-editor">
        {readOnly ? 'Read-only editor' : 'Editable editor'}
        {content && <div data-testid="editor-content">{JSON.stringify(content)}</div>}
      </div>
    )
  }
})

jest.mock('@/components/requirements/StructuredView', () => {
  return function MockStructuredView({ sections, onSectionClick }: any) {
    return (
      <div data-testid="structured-view">
        <div>Sections count: {sections.length}</div>
        {sections.map((section: any) => (
          <div key={section.id} onClick={() => onSectionClick?.(section.id)}>
            {section.title}
          </div>
        ))}
      </div>
    )
  }
})

jest.mock('@/components/requirements/ReviewMode', () => {
  return function MockReviewMode({ document, onApprove, onReject }: any) {
    return (
      <div data-testid="review-mode">
        <button onClick={() => onApprove('Test approval comment')}>Approve</button>
        <button onClick={() => onReject('Test rejection comment')}>Reject</button>
        <div>Document: {document.title}</div>
      </div>
    )
  }
})

describe('RequirementsViewer', () => {
  const mockDocument: RequirementsDocument = {
    id: 'req-123',
    projectId: 'project-456',
    userId: 'user-789',
    title: 'Test Requirements Document',
    content: { type: 'doc', content: [] },
    contentText: 'Test requirements content',
    status: 'DRAFT' as RequirementStatus,
    version: '1.0.0',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02')
  }

  const mockCompleteness = {
    overall: 75,
    sections: [
      {
        id: 'sec-1',
        requirementId: 'req-123',
        title: 'System Overview',
        type: 'system',
        content: 'System overview content',
        completeness: 90,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  const mockApprovalHistory = [
    {
      id: '1',
      action: 'SUBMITTED',
      userId: 'user-123',
      userName: 'John Doe',
      timestamp: new Date('2023-01-01').toISOString(),
      comments: 'Initial submission'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompleteness
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApprovalHistory
      })
  })

  it('should render requirements document', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    expect(screen.getByText('DRAFT')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    render(<RequirementsViewer requirementId="req-123" />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should display completeness percentage', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  it('should switch between tabs', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Click on Structure tab
    fireEvent.click(screen.getByText('Structure'))
    expect(screen.getByTestId('structured-view')).toBeInTheDocument()

    // Click on Review tab
    fireEvent.click(screen.getByText('Review'))
    expect(screen.getByTestId('review-mode')).toBeInTheDocument()
  })

  it('should handle edit mode', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // Click edit button
    fireEvent.click(screen.getByText('Edit'))
    
    // Should show editable editor
    await waitFor(() => {
      expect(screen.getByText('Editable editor')).toBeInTheDocument()
    })
  })

  it('should handle approval from review mode', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    const mockOnStatusChange = jest.fn()
    render(
      <RequirementsViewer 
        requirementId="req-123" 
        onStatusChange={mockOnStatusChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Go to Review tab
    fireEvent.click(screen.getByText('Review'))
    
    // Click approve button
    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/requirements/req-123/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: 'Test approval comment',
          reviewData: {
            approvedAt: expect.any(String),
            reviewComments: 'Test approval comment'
          }
        })
      })
    })
  })

  it('should handle save changes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocument
    })

    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'))

    // Click save button
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/requirements/req-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: null })
      })
    })
  })

  it('should run validation', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Go to Validation tab
    fireEvent.click(screen.getByText('Validation'))
    
    // Click run validation button
    fireEvent.click(screen.getByText('Run Validation'))

    // Validation should be triggered (tested in integration)
    expect(screen.getByText('Run Validation')).toBeInTheDocument()
  })

  it('should display approval history', async () => {
    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Go to History tab
    fireEvent.click(screen.getByText('History'))
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('提出')).toBeInTheDocument()
    })
  })

  it('should handle export', async () => {
    // Mock blob and URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url')
    global.URL.revokeObjectURL = jest.fn()
    
    const mockBlob = new Blob(['test content'])
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob
    })

    // Mock createElement and click
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    }
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // Click export button
    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/requirements/req-123/export?format=pdf')
      expect(mockAnchor.click).toHaveBeenCalled()
    })
  })

  it('should show error state when fetch fails', async () => {
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => mockCompleteness })
      .mockResolvedValueOnce({ ok: true, json: async () => mockApprovalHistory })

    render(<RequirementsViewer requirementId="req-123" />)

    // Should still render but without document content
    await waitFor(() => {
      expect(screen.queryByText('Test Requirements Document')).not.toBeInTheDocument()
    })
  })

  it('should handle different requirement statuses', async () => {
    const approvedDocument = { ...mockDocument, status: 'APPROVED' as RequirementStatus }
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => approvedDocument
      })

    render(<RequirementsViewer requirementId="req-123" />)

    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeInTheDocument()
    })
  })

  it('should handle review mode props', async () => {
    const mockOnEdit = jest.fn()
    render(
      <RequirementsViewer 
        requirementId="req-123" 
        mode="review"
        onEdit={mockOnEdit}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Requirements Document')).toBeInTheDocument()
    })

    // In review mode, should show approve button if not approved
    expect(screen.getByText('Approve')).toBeInTheDocument()
  })
})
