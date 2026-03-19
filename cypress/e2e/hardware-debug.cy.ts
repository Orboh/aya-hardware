describe('Hardware Debug Support E2E', () => {
  beforeEach(() => {
    // ログインとプロジェクト作成
    (cy as any).login('test@example.com', 'password')
    (cy as any).createProject('Test Hardware Debug Project')
    
    // Mock WebSocket connection
    (cy as any).window().then((win: Window) => {
      // @ts-ignore
      win.WebSocket = class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.onopen?.({} as Event)
          }, 100)
        }
        send() {}
        close() {}
        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
      }
    })
    
    // Mock getUserMedia
    (cy as any).window().then((win: Window) => {
      const mockStream = {
        getTracks: () => [{ stop: (cy as any).stub() }],
        getAudioTracks: () => [{ enabled: true }],
        getVideoTracks: () => [{ enabled: true }]
      }
      
      // @ts-ignore
      win.navigator.mediaDevices = {
        getUserMedia: (cy as any).stub().resolves(mockStream),
        enumerateDevices: (cy as any).stub().resolves([
          { deviceId: 'camera1', kind: 'videoinput', label: 'Test Camera' }
        ])
      }
    })
  })

  it('completes full hardware debug workflow', () => {
    // 1. Navigate to Hardware Debug Support tab
    (cy as any).get('button').contains('Hardware Debug Support').click()
    
    // Verify tab is active
    (cy as any).get('button').contains('Hardware Debug Support')
      .should('have.class', 'border-[#00AEEF]')
    
    // 2. Verify initial UI state
    (cy as any).contains('Hardware Debug Support').should('be.visible')
    (cy as any).contains('Show your hardware components').should('be.visible')
    (cy as any).contains('Camera is off').should('be.visible')
    
    // 3. Start webcam session
    (cy as any).get('button').contains('Start Session').click()
    
    // Wait for connection
    (cy as any).contains('Connected', { timeout: 5000 }).should('be.visible')
    
    // 4. Verify webcam is active
    (cy as any).get('video').should('be.visible')
    (cy as any).get('button').contains('Stop Session').should('be.visible')
    (cy as any).get('button').contains('Mute').should('be.visible')
    
    // 5. Test camera switching (if multiple cameras)
    (cy as any).get('select#camera-select').should('exist')
    (cy as any).get('select#camera-select option').should('have.length.at.least', 1)
    
    // 6. Test mute/unmute functionality
    (cy as any).get('button').contains('Mute').click()
    (cy as any).get('button').contains('Unmute').should('be.visible')
    (cy as any).get('button').contains('Unmute').click()
    (cy as any).get('button').contains('Mute').should('be.visible')
    
    // 7. Simulate voice input and vision analysis
    (cy as any).window().then((win: Window) => {
      // Simulate voice input received
      const ws = (win as any).wsRef?.current
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'conversation.item.created',
            item: {
              role: 'user',
              transcript: 'この回路基板を確認してください'
            }
          })
        }))
      }
    })
    
    // 8. Verify message appears in ChatPanel
    (cy as any).get('.flex.justify-end').should('exist')
    (cy as any).contains('Voice Input').should('be.visible')
    (cy as any).contains('この回路基板を確認してください').should('be.visible')
    
    // 9. Simulate AI vision analysis response
    (cy as any).intercept('POST', '/api/analyze-vision', {
      statusCode: 200,
      body: {
        analysis: 'Arduino Unoと赤色LEDが接続されています。抵抗が見当たりません。',
        debugSuggestions: ['LEDに適切な抵抗を追加してください']
      }
    }).as('analyzeVision')
    
    (cy as any).window().then((win: Window) => {
      // Simulate function call for vision analysis
      const ws = (win as any).wsRef?.current
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'response.function_call_arguments.done',
            name: 'analyze_webcam',
            call_id: 'test-call-123'
          })
        }))
      }
    })
    
    (cy as any).wait('@analyzeVision')
    
    // 10. Verify vision analysis appears
    (cy as any).contains('Vision Analysis').should('be.visible')
    (cy as any).contains('Arduino Unoと赤色LEDが接続されています').should('be.visible')
    
    // 11. Test image expansion in debug message
    (cy as any).get('img[alt="Debug capture"]').should('exist')
    (cy as any).get('img[alt="Debug capture"]').parent().click()
    (cy as any).contains('Click to collapse image').should('be.visible')
    
    // 12. Test error handling - disconnect
    (cy as any).window().then((win: Window) => {
      const ws = (win as any).wsRef?.current
      if (ws && ws.onclose) {
        ws.onclose(new CloseEvent('close', { code: 1006 }))
      }
    })
    
    (cy as any).contains('Connection lost').should('be.visible')
    
    // 13. Stop session
    (cy as any).get('button').contains('Stop Session').click()
    (cy as any).contains('Camera is off').should('be.visible')
    (cy as any).get('button').contains('Start Session').should('be.visible')
  })

  it('handles permission errors gracefully', () => {
    // Mock getUserMedia rejection
    (cy as any).window().then((win: Window) => {
      // @ts-ignore
      win.navigator.mediaDevices = {
        getUserMedia: (cy as any).stub().rejects(new Error('NotAllowedError')),
        enumerateDevices: (cy as any).stub().resolves([])
      }
    })
    
    // Navigate to Hardware Debug Support
    (cy as any).get('button').contains('Hardware Debug Support').click()
    
    // Try to start session
    (cy as any).get('button').contains('Start Session').click()
    
    // Should show permission error
    (cy as any).contains('Camera permission denied').should('be.visible')
  })
})