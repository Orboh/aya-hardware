import 'openai/shims/node'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../pages/api/analyze-vision'
import OpenAI from 'openai'

// Mock OpenAI
jest.mock('openai')

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('/api/analyze-vision', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock
  let mockCreate: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn().mockReturnValue({ json: mockJson })

    req = {
      method: 'POST',
      body: {}
    }

    res = {
      status: mockStatus,
      json: mockJson
    }

    // Mock OpenAI chat completions
    mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: 'テスト画像解析結果'
        }
      }]
    })

    mockOpenAI.prototype.chat = {
      completions: {
        create: mockCreate
      }
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should reject non-POST requests', async () => {
    req.method = 'GET'

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockStatus).toHaveBeenCalledWith(405)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  it('should require image data', async () => {
    req.body = { text: 'テストプロンプト' }

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockStatus).toHaveBeenCalledWith(400)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Image data is required' })
  })

  it('should analyze image without context', async () => {
    req.body = {
      image: 'base64encodedimage',
      text: 'この画像の回路を解析してください'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-5',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'この画像の回路を解析してください'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,base64encodedimage',
              detail: 'low'
            }
          }
        ]
      }],
      max_completion_tokens: 500,
      // temperature: 0.7
    })

    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockJson).toHaveBeenCalledWith({
      analysis: 'テスト画像解析結果',
      description: 'テスト画像解析結果',
      debugSuggestions: expect.any(Array)
    })
  })

  it('should include AYA context in analysis when provided', async () => {
    const context = {
      systemDesign: [
        { name: 'Arduino Uno', type: 'microcontroller' }
      ],
      partsInfo: [
        { name: 'LED', category: 'display' }
      ],
      compatibilityIssues: [
        { type: 'voltage', description: '電圧不一致: 5V -> 3.3V' }
      ]
    }

    req.body = {
      image: 'base64encodedimage',
      text: 'LEDが点灯しない',
      context
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    const callArgs = mockCreate.mock.calls[0][0]
    const textContent = callArgs.messages[0].content[0].text

    expect(textContent).toContain('LEDが点灯しない')
    expect(textContent).toContain('デバッグコンテキスト')
    expect(textContent).toContain('Arduino Uno')
    expect(textContent).toContain('LED')
    expect(textContent).toContain('電圧不一致')
  })

  it('should use default prompt when text is not provided', async () => {
    req.body = {
      image: 'base64encodedimage'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    const callArgs = mockCreate.mock.calls[0][0]
    const textContent = callArgs.messages[0].content[0].text

    expect(textContent).toContain('この画像に何が写っているか日本語で説明してください')
  })

  it('should extract debug suggestions from analysis', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: `回路基板の解析結果:
          - 配線を確認してください
          - 電源供給をチェックしてください
          - 部品の向きを検証してください`
        }
      }]
    })

    req.body = {
      image: 'base64encodedimage'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    const response = mockJson.mock.calls[0][0]
    expect(response.debugSuggestions).toHaveLength(3)
    expect(response.debugSuggestions).toContain('配線を確認してください')
    expect(response.debugSuggestions).toContain('電源供給をチェックしてください')
    expect(response.debugSuggestions).toContain('部品の向きを検証してください')
  })

  it('should provide default suggestions when none found in analysis', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'シンプルな回路基板です。'
        }
      }]
    })

    req.body = {
      image: 'base64encodedimage'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    const response = mockJson.mock.calls[0][0]
    expect(response.debugSuggestions).toHaveLength(3)
    expect(response.debugSuggestions).toContain('配線接続を確認してください')
    expect(response.debugSuggestions).toContain('電源供給を確認してください')
    expect(response.debugSuggestions).toContain('部品の向きを確認してください')
  })

  it('should handle OpenAI API errors gracefully', async () => {
    const error = new Error('OpenAI API Error')
    mockCreate.mockRejectedValue(error)

    req.body = {
      image: 'base64encodedimage'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockStatus).toHaveBeenCalledWith(500)
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Failed to analyze image',
      details: 'OpenAI API Error'
    })
  })

  it('should handle missing response content', async () => {
    mockCreate.mockResolvedValue({
      choices: []
    })

    req.body = {
      image: 'base64encodedimage'
    }

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockJson).toHaveBeenCalledWith({
      analysis: '画像を分析できませんでした',
      description: '画像を分析できませんでした',
      debugSuggestions: expect.any(Array)
    })
  })
})
