// End-to-End tests for Requirements Workflow
import { test, expect, Page, Route } from '@playwright/test'

// Mock data for consistent testing
const mockRequirementsData = {
  id: 'req-e2e-123',
  title: 'E2E Test Requirements',
  contentText: 'Temperature monitoring system with IoT capabilities and sensor accuracy requirements',
  status: 'DRAFT',
  version: 1
}

const mockSystemSuggestions = [
  {
    id: 'sys-e2e-1',
    name: 'IoT Temperature Monitoring System',
    description: 'Complete// temperature monitoring solution with wireless connectivity',
    components: [
      {
        id: 'comp-1',
        name: 'Temperature Sensor',
        type: 'sensor',
        reasoning: 'Provides accurate// temperature measurement'
      },
      {
        id: 'comp-2',
        name: 'Wireless Module',
        type: 'communication',
        reasoning: 'Enables IoT connectivity'
      }
    ],
    estimatedCost: { min: 50, max: 100, currency: 'USD' },
    estimatedDevelopmentTime: { min: 6, max: 10, unit: 'weeks' }
  }
]

// Setup function to mock API responses
async function setupApiMocks(page: Page) {
  // Mock requirements generation
  await page.route('/api/requirements/generate', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRequirementsData)
    })
  })

  // Mock requirements analysis
  await page.route('/api/requirements/analyze', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        completeness: 65,
        questions: [
          {
            id: 'q1',
            question: 'What is the required// temperature measurement range?',
            intent: 'Define sensor specifications',
            priority: 1,
            answered: false
          },
          {
            id: 'q2',
            question: 'What wireless protocols should be supported?',
            intent: 'Define communication requirements',
            priority: 2,
            answered: false
          }
        ],
        systemType: 'iot-system'
      })
    })
  })

  // Mock requirements update from answer
  await page.route('/api/requirements/update-from-answer', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Updated Requirements' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Temperature monitoring system with range -20°C to 85°C' }]
            }
          ]
        },
        decisions: [],
        updatedSections: ['technical-specs']
      })
    })
  })

  // Mock requirements approval
  await page.route('/api/requirements/*/approve', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'APPROVED'
      })
    })
  })

  // Mock approval history
  await page.route('/api/requirements/*/approval-history', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          action: 'SUBMITTED',
          userId: 'user-123',
          userName: 'Test User',
          timestamp: new Date().toISOString(),
          comments: 'Initial submission'
        }
      ])
    })
  })

  // Mock approved requirements
  await page.route('/api/requirements/approved*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          ...mockRequirementsData,
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        }
      ])
    })
  })

  // Mock system suggestions generation
  await page.route('/api/system-suggestions/generate', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSystemSuggestions)
    })
  })

  // Mock requirements validation
  await page.route('/api/requirements/validate-approval', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        approvedRequirements: [mockRequirementsData.id],
        unapprovedRequirements: []
      })
    })
  })
}

test.describe('AYA Hardware Requirements Dialogue E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
  })

  test('Complete requirements definition and approval workflow', async ({ page }) => {
    // Navigate to the application
    await page.goto('/aya-hardware-requirements')

    // Start a new requirements session
    await page.click('[data-testid="start-new-requirements"]')

    // Enter initial requirements prompt
    await page.fill('[data-testid="requirements-prompt"]',
      'I need a// temperature monitoring system for industrial use with IoT connectivity')

    // Submit the prompt
    await page.click('[data-testid="generate-requirements"]')

    // Wait for requirements to be generated
    await expect(page.locator('[data-testid="requirements-title"]')).toHaveText('E2E Test Requirements')
    await expect(page.locator('[data-testid="requirements-status"]')).toHaveText('DRAFT')

    // Switch to Structure view to see sections
    await page.click('[data-testid="structure-tab"]')
    await expect(page.locator('[data-testid="structured-view"]')).toBeVisible()

    // Switch to AYA dialogue for refinement
    await page.click('[data-testid="aya-dialogue-tab"]')

    // AYA should ask the first question
    await expect(page.locator('[data-testid="ay'])
  })
})