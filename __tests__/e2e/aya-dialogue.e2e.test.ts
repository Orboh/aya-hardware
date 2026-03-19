// End-to-End tests for AYA Dialogue System
import { test, expect, Page, Route } from '@playwright/test'

// Mock AYA dialogue responses
const mockAyaResponses = {
  welcome: 'Hello! I\'m AYA, your AI assistant for hardware requirements definition. How can I help you today?',
  followUpQuestion: 'Great! For that temperature range, what accuracy do you require?',
  systemSuggestion: 'Based on your requirements, I suggest considering a digital temperature sensor with I2C interface.',
  clarification: 'Could you clarify the power requirements for your system?',
  completion: 'Excellent! Your requirements are now complete. Would you like me to generate system suggestions?'
}

async function setupAyaMocks(page: Page) {
  // Mock AYA chat responses
  await page.route('/api/aya/chat', async (route: Route) => {
    const request = await route.request()
    const body = await request.postDataJSON()
    const userMessage = body.messages[body.messages.length - 1].content.toLowerCase()

    let response = mockAyaResponses.welcome

    if (userMessage.includes('temperature')) {
      response = mockAyaResponses.followUpQuestion
    } else if (userMessage.includes('range') || userMessage.includes('°c')) {
      response = mockAyaResponses.followUpQuestion
    } else if (userMessage.includes('accuracy')) {
      response = mockAyaResponses.systemSuggestion
    } else if (userMessage.includes('power')) {
      response = mockAyaResponses.clarification
    } else if (userMessage.includes('yes') || userMessage.includes('complete')) {
      response = mockAyaResponses.completion
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: response,
        suggestions: userMessage.includes('suggestion') ? [
          'Consider temperature sensors with built-in calibration',
          'Look into wireless communication modules',
          'Evaluate power management solutions'
        ] : [],
        nextQuestions: userMessage.includes('temperature') ? [
          {
            id: 'temp-range',
            question: 'What is the required temperature measurement range?',
            priority: 1
          },
          {
            id: 'temp-accuracy',
            question: 'What accuracy is needed for temperature measurements?',
            priority: 2
          }
        ] : [],
        confidence: 0.95,
        context: 'temperature-monitoring-system'
      })
    })
  })

  // Mock requirements analysis for AYA context
  await page.route('/api/requirements/analyze-for-aya', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currentState: {
          completeness: 45,
          missingAreas: ['power-requirements', 'environmental-specs'],
          strengths: ['functional-requirements', 'basic-specifications']
        },
        suggestions: [
          'Define power consumption requirements',
          'Specify operating environment conditions',
          'Add interface specifications'
        ],
        priorityQuestions: [
          {
            id: 'power-1',
            question: 'What is the expected power consumption?',
            area: 'power-requirements',
            importance: 'high'
          }
        ]
      })
    })
  })

  // Mock AYA context updates
  await page.route('/api/aya/update-context', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        updatedContext: {
          systemType: 'temperature-sensor',
          requirements: ['temp-range', 'accuracy', 'power'],
          completeness: 75
        }
      })
    })
  })
}

test.describe('AYA Dialogue System E2E Tests', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupAyaMocks(page)
  })

  test('AYA welcome and initial interaction', async ({ page }: { page: Page }) => {
    await page.goto('/aya-hardware-requirements')

    // Start AYA dialogue
    await page.click('[data-testid="start-aya-dialogue"]')

    // AYA welcome message should appear
    await expect(page.locator('[data-testid="aya-message"]').first()).toContainText('Hello! I\'m AYA')

    // Chat interface should be active
    await expect(page.locator('[data-testid="aya-chat-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="aya-chat-input"]')).toBeEnabled()

    // Send initial message
    await page.fill('[data-testid="aya-chat-input"]', 'I need help creating requirements for a temperature monitoring system')
    await page.click('[data-testid="send-message"]')

    // User message should appear in chat
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('temperature monitoring system')

    // AYA should respond with temperature-related question
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('temperature range')

    // Next questions should be suggested
    await expect(page.locator('[data-testid="suggested-questions"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggested-question"]').first()).toContainText('measurement range')
  })

  test('AYA guided requirements elicitation', async ({ page }: { page: Page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Start with temperature system request
    await page.fill('[data-testid="aya-chat-input"]', 'I need a temperature monitoring system')
    await page.click('[data-testid="send-message"]')

    // Wait for AYA response
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('temperature range')

    // Answer the temperature range question
    await page.fill('[data-testid="aya-chat-input"]', 'The system needs to measure from -20°C to 85°C')
    await page.click('[data-testid="send-message"]')
  })
}