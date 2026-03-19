// Unit tests for RequirementsValidator
import { RequirementsValidator } from '@/lib/validators/requirementsValidator'
import { RequirementsDocument, RequirementsSection } from '@/types/requirements'

describe('RequirementsValidator', () => {
  let validator: RequirementsValidator

  beforeEach(() => {
    validator = new RequirementsValidator()
  })

  describe('checkConsistency', () => {
    it('should detect low power vs high performance contradiction', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'The system must be low-power battery-powered device with high-performance real-time processing.',
        version: '1',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          title: 'Functional Requirements',
          type: 'system',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          title: 'Constraints',
          type: 'system',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      expect(result.isConsistent).toBe(true) // No critical errors, only warnings
      expect(result.issues.some(i => i.message.includes('Low power requirement conflicts with high performance'))).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should detect size vs features contradiction', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'The device should be compact and miniature but have many features and extensive functionality.',
        version: '1',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          title: 'Functional Requirements',
          type: 'system',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          title: 'Constraints',
          type: 'system',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      expect(result.issues.some(i => i.message.includes('Size constraints may conflict'))).toBe(true)
    })

    it('should check numeric consistency for// temperature ranges', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Temperature sensor with fast response and good accuracy.',
        version: '1',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          title: 'Functional Requirements',
          type: 'system',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          title: 'Constraints',
          type: 'system',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      // Check that ambiguous language is detected
      expect(result.issues.some(i => i.message.includes('Ambiguous term'))).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should check for missing critical sections', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Some basic description',
        version: '1',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
   
// ... truncated ...