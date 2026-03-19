import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import handler from '../../pages/api/debug/context/[projectId]'
import { prisma } from '@/lib/prisma'
import type { DebugContext } from '@/types/debug'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/debug/context/[projectId]', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    
    req = {
      method: 'GET',
      query: {}
    }
    
    res = {
      status: mockStatus,
      json: mockJson
    }

    // Default mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com'
      }
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should reject non-GET requests', async () => {
    req.method = 'POST'
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(mockStatus).toHaveBeenCalledWith(405)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should require authentication', async () => {
    mockGetServerSession.mockResolvedValue(null)
    req.query = { projectId: 'project-123' }
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(mockStatus).toHaveBeenCalledWith(401)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })

  it('should require projectId parameter', async () => {
    req.query = {}
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(mockStatus).toHaveBeenCalledWith(400)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Project ID is required' })
  })

  it('should handle non-existent project', async () => {
    req.query = { projectId: 'non-existent' }
    mockPrisma.project.findUnique.mockResolvedValue(null)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'non-existent',
        userId: 'user-123'
      },
      include: {
        nodes: true,
        connections: true
      }
    })
    
    expect(mockStatus).toHaveBeenCalledWith(404)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Project not found' })
  })

  it('should return debug context for valid project', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'user-123',
      nodes: [
        {
          id: 'node-1',
          type: 'microcontroller',
          data: {
            name: 'Arduino Uno',
            category: 'controller',
            specifications: {
              voltage: 5,
              pins: 20
            },
            price: 3000,
            availability: 'in-stock'
          }
        },
        {
          id: 'node-2',
          type: 'component',
          data: {
            name: 'LED',
            category: 'display',
            specifications: {
              voltage: 3.3,
              current: 0.02
            }
          }
        }
      ],
      connections: [
        {
          id: 'conn-1',
          source: 'node-1',
          target: 'node-2'
        }
      ]
    }
    
    req.query = { projectId: 'project-123' }
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject as any)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    const expectedContext: DebugContext = {
      systemDesign: [
        {
          id: 'node-1',
          name: 'Arduino Uno',
          type: 'microcontroller',
          specifications: {
            voltage: 5,
            pins: 20
          },
          connections: ['conn-1']
        },
        {
          id: 'node-2',
          name: 'LED',
          type: 'component',
          specifications: {
            voltage: 3.3,
            current: 0.02
          },
          connections: ['conn-1']
        }
      ],
      partsInfo: [
        {
          id: 'node-1',
          name: 'Arduino Uno',
          category: 'controller',
          specifications: {
            voltage: 5,
            pins: 20
          },
          price: 3000,
          availability: 'in-stock'
        },
        {
          id: 'node-2',
          name: 'LED',
          category: 'display',
          specifications: {
            voltage: 3.3,
            current: 0.02
          },
          price: undefined,
          availability: undefined
        }
      ],
      compatibilityIssues: [
        {
          id: 'voltage-conn-1',
          type: 'voltage',
          severity: 'error',
          description: '電圧不一致: Arduino Uno (5V) と LED (3.3V)',
          affectedNodes: ['node-1', 'node-2']
        }
      ],
      previousDebugSessions: []
    }
    
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockJson).toHaveBeenCalledWith(expectedContext)
  })

  it('should detect missing connections warning', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'user-123',
      nodes: [
        {
          id: 'node-1',
          data: {
            name: 'Sensor',
            requiredConnections: true
          }
        }
      ],
      connections: []
    }
    
    req.query = { projectId: 'project-123' }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    const response = mockJson.mock.calls[0][0] as DebugContext
    
    expect(response.compatibilityIssues).toContainEqual({
      id: 'missing-connection-node-1',
      type: 'other',
      severity: 'warning',
      description: 'Sensor に接続がありません',
      affectedNodes: ['node-1']
    })
  })

  it('should handle project with no nodes gracefully', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'user-123',
      nodes: [],
      connections: []
    }
    
    req.query = { projectId: 'project-123' }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    const expectedContext: DebugContext = {
      systemDesign: [],
      partsInfo: [],
      compatibilityIssues: [],
      previousDebugSessions: []
    }
    
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockJson).toHaveBeenCalledWith(expectedContext)
  })

  it('should handle database errors gracefully', async () => {
    req.query = { projectId: 'project-123' }
    const dbError = new Error('Database connection failed')
    mockPrisma.project.findUnique.mockRejectedValue(dbError)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    expect(mockStatus).toHaveBeenCalledWith(500)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Failed to fetch debug context',
      details: 'Database connection failed'
    })
  })

  it('should handle missing node data gracefully', async () => {
    const mockProject = {
      id: 'project-123',
      userId: 'user-123',
      nodes: [
        {
          id: 'node-1',
          // data is missing/undefined
        }
      ],
      connections: []
    }
    
    req.query = { projectId: 'project-123' }
    mockPrisma.project.findUnique.mockResolvedValue(mockProject as any)
    
    await handler(req as NextApiRequest, res as NextApiResponse)
    
    const response = mockJson.mock.calls[0][0] as DebugContext
    
    expect(response.systemDesign[0]).toEqual({
      id: 'node-1',
      name: 'Unknown',
      type: 'component',
      specifications: {},
      connections: []
    })
    
    expect(response.partsInfo).toHaveLength(0) // No category, so filtered out
  })
})
