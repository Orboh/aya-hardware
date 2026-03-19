import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/debug/context/[projectId]'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    }
  }
}))

describe('/api/debug/context/[projectId]', () => {
  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com' }
  }

  const mockProject = {
    id: 'project-123',
    userId: 'user-123',
    nodes: [
      {
        id: 'node1',
        type: 'component',
        data: {
          name: 'Arduino Uno',
          category: 'microcontroller',
          specifications: { voltage: 5 },
          price: 2500,
          availability: 'in stock'
        }
      },
      {
        id: 'node2',
        type: 'component',
        data: {
          name: 'LED',
          specifications: { voltage: 3.3 }
        }
      }
    ],
    connections: [
      {
        id: 'conn1',
        source: 'node1',
        target: 'node2'
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns debug context for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { projectId: 'project-123' }
    })

    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const jsonData = JSON.parse(res._getData())
    
    expect(jsonData).toHaveProperty('systemDesign')
    expect(jsonData).toHaveProperty('partsInfo')
    expect(jsonData).toHaveProperty('compatibilityIssues')
    expect(jsonData.systemDesign).toHaveLength(2)
    expect(jsonData.partsInfo).toHaveLength(1) // Only Arduino Uno has category
    expect(jsonData.compatibilityIssues).toHaveLength(1) // Voltage mismatch
  })

  it('returns 401 for unauthenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { projectId: 'project-123' }
    })

    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 for non-existent project', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { projectId: 'non-existent' }
    })

    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

    await handler(req, res)

    expect(res._getStatusCode()).toBe(404)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Project not found' })
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { projectId: 'project-123' }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('detects voltage compatibility issues', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { projectId: 'project-123' }
    })

    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)

    await handler(req, res)

    const jsonData = JSON.parse(res._getData())
    const voltageIssue = jsonData.compatibilityIssues[0]
    
    expect(voltageIssue.type).toBe('voltage')
    expect(voltageIssue.severity).toBe('error')
    expect(voltageIssue.description).toContain('電圧不一致')
    expect(voltageIssue.affectedNodes).toContain('node1')
    expect(voltageIssue.affectedNodes).toContain('node2')
  })
})
