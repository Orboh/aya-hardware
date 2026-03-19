// Unit tests for QuestionGenerationEngine
import { QuestionGenerationEngine } from '@/lib/ai/questionGenerator'

describe('QuestionGenerationEngine', () => {
  let engine: QuestionGenerationEngine

  beforeEach(() => {
    engine = new QuestionGenerationEngine()
  })

  describe('detectSystemType', () => {
    it('should detect temperature sensor systems', () => {
      const requirements = 'Temperature monitoring system with thermal sensors'
      const types = (engine as any)['detectSystemType'](requirements)
      expect(types).toContain('temperature_sensor')
    })

    it('should detect motor control systems', () => {
      const requirements = 'Motor control system for servo actuators'
      const types = (engine as any)['detectSystemType'](requirements)
      expect(types).toContain('motor_control')
    })

    it('should detect wireless communication systems', () => {
      const requirements = 'Wireless IoT device with WiFi connectivity'
      const types = (engine as any)['detectSystemType'](requirements)
      expect(types).toContain('wireless_communication')
    })

    it('should detect power supply requirements', () => {
      const requirements = 'Battery powered device with voltage regulation'
      const types = (engine as any)['detectSystemType'](requirements)
      expect(types).toContain('power_supply')
    })

    it('should detect multiple system types', () => {
      const requirements = 'Temperature sensor with wireless communication and motor control'
      const types = (engine as any)['detectSystemType'](requirements)
      expect(types).toContain('temperature_sensor')
      expect(types).toContain('wireless_communication')
      expect(types).toContain('motor_control')
    })
  })

  describe('analyzeCompleteness', () => {
    it('should analyze requirement completeness', () => {
      const requirements = 'System purpose is monitoring. Functions include measurement and control. Performance must be high accuracy.'
      const scores = (engine as any)['analyzeCompleteness'](requirements)

      expect(scores.get('purpose')).toBeGreaterThan(0)
      expect(scores.get('functional')).toBeGreaterThan(0)
      expect(scores.get('performance')).toBeGreaterThan(0)
    })

    it('should return low scores for incomplete requirements', () => {
      const requirements = 'Basic system'
      const scores = (engine as any)['analyzeCompleteness'](requirements)

      expect(scores.get('functional')).toBeLessThan(50)
      expect(scores.get('performance')).toBeLessThan(50)
    })
  })

  describe('generateQuestions', () => {
    it('should generate questions for low completeness', () => {
      const context = {
        existingRequirements: 'Basic temperature system',
        sectionType: 'hardware' as const,
        completenessScore: 20
      }

      const questions = engine.generateQuestions(context)

      expect(questions.length).toBeGreaterThan(0)
      expect(questions[0].priority).toBe(1) // Should prioritize basic questions
      expect(questions[0].question.toLowerCase()).toContain('purpose')
    })

    it('should generate technical questions for temperature sensors', () => {
      const context = {
        existingRequirements: 'Temperature monitoring system for industrial use',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const questions = engine.generateQuestions(context)

      const hasTemperatureQuestion = questions.some(q =>
        q.question.toLowerCase().includes('temperature') ||
        q.question.toLowerCase().includes('range') ||
        q.question.toLowerCase().includes('accuracy')
      )
      expect(hasTemperatureQuestion).toBe(true)
    })

    it('should generate environment questions when missing', () => {
      const context = {
        existingRequirements: 'Temperature sensor system',
        sectionType: 'hardware' as const,
        completenessScore: 40
      }

      const questions = engine.generateQuestions(context)

      const hasEnvironmentQuestion = questions.some(q =>
        q.question.toLowerCase().includes('environment') ||
        q.question.toLowerCase().includes('operating conditions')
      )
      expect(hasEnvironmentQuestion).toBe(true)
    })

    it('should limit questions to maximum of 5', () => {
      const context = {
        existingRequirements: 'Basic system without details',
        sectionType: 'hardware' as const,
        completenessScore: 10
      }

      const questions = engine.generateQuestions(context)
      expect(questions.length).toBeLessThanOrEqual(5)
    })

    it('should sort questions by priority', () => {
      const context = {
        existingRequirements: 'Temperature sensor with some details',
        sectionType: 'hardware' as const,
        completenessScore: 30
      }

      const questions = engine.generateQuestions(context)

      // Check that questions are sorted by priority (ascending)
      for (let i = 1; i < questions.length; i++) {
        expect(questions[i].priority).toBeGreaterThanOrEqual(questions[i - 1].priority)
      }
    })
  })

  describe('generateFollowUpQuestion', () => {
    it('should generate temperature range follow-up', () => {
      const context = {
        existingRequirements: 'Temperature system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Temperature monitoring', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('range')
    })

    it('should generate wireless range follow-up', () => {
      const context = {
        existingRequirements: 'Wireless system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Wireless communication', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('range')
    })

    it('should generate battery life follow-up', () => {
      const context = {
        existingRequirements: 'Battery powered device',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Power supply', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('battery life')
    })
  })
})