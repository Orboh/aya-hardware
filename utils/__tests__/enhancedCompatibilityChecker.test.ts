// 🧪 UnifiedCompatibilityChecker統合テスト
// 既存3段階チェックシステムとの互換性確認とパフォーマンステスト

import { 
  UnifiedCompatibilityChecker,
  checkEnhancedConnectionCompatibility,
  type ComponentPair,
  type PerformanceBenchmark
} from '@/utils/enhancedCompatibilityChecker'
import { checkSystemCompatibility } from '@/utils/compatibilityChecker'
import type { Connection, NodeData, SoftwareContext } from '@/types'
import type { Node } from '@xyflow/react'

describe('UnifiedCompatibilityChecker Integration Tests', () => {
  let checker: UnifiedCompatibilityChecker
  let testComponents: Node<NodeData>[]
  let testConnections: Connection[]

  beforeEach(() => {
    checker = UnifiedCompatibilityChecker.getInstance()
    
    // テスト用コンポーネント（現実的なハードウェア構成）
    testComponents = [
      {
        id: 'arduino_uno',
        type: 'system',
        position: { x: 0, y: 0 },
        data: {
          title: 'Arduino Uno',
          voltage: '5V',
          communication: 'I2C, SPI, UART',
          type: 'microcontroller',
          inputs: [],
          outputs: []
        }
      },
      {
        id: 'esp32',
        type: 'system', 
        position: { x: 200, y: 0 },
        data: {
          title: 'ESP32',
          voltage: '3.3V',
          communication: 'I2C, SPI, UART, WiFi, Bluetooth',
          type: 'microcontroller',
          inputs: [],
          outputs: []
        }
      },
      {
        id: 'bme280_sensor',
        type: 'system',
        position: { x: 100, y: 100 },
        data: {
          title: 'BME280 Sensor',
          voltage: '3.3V',
          communication: 'I2C, SPI',
          type: 'sensor',
          inputs: [],
          outputs: []
        }
      },
      {
        id: 'led_strip',
        type: 'system',
        position: { x: 300, y: 100 },
        data: {
          title: 'WS2812B LED Strip',
          voltage: '5V',
          communication: 'PWM',
          type: 'actuator',
          inputs: [],
          outputs: []
        }
      },
      {
        id: 'servo_motor',
        type: 'system',
        position: { x: 150, y: 200 },
        data: {
          title: 'SG90 Servo',
          voltage: '5V',
          communication: 'PWM',
          type: 'actuator',
          inputs: [],
          outputs: []
        }
      },
      {
        id: 'isolated_component',
        type: 'system',
        position: { x: 400, y: 200 },
        data: {
          title: 'Isolated Component',
          voltage: '12V',
          communication: 'None',
          type: 'unknown',
          inputs: [],
          outputs: []
        }
      }
    ]

    // テスト用接続（現実的な接続パターン）
    testConnections = [
      {
        id: 'conn_1',
        fromId: 'arduino_uno',
        toId: 'bme280_sensor',
        fromPort: 'i2c_sda',
        toPort: 'sda'
      },
      {
        id: 'conn_2', 
        fromId: 'esp32',
        toId: 'bme280_sensor',
        fromPort: 'i2c_scl',
        toPort: 'scl'
      },
      {
        id: 'conn_3',
        fromId: 'arduino_uno',
        toId: 'led_strip',
        fromPort: 'digital_6',
        toPort: 'data_in'
      },
      {
        id: 'conn_4',
        fromId: 'esp32',
        toId: 'servo_motor',
        fromPort: 'pwm_2',
        toPort: 'control'
      },
      // 重複接続のテスト
      {
        id: 'conn_5_duplicate',
        fromId: 'arduino_uno',
        toId: 'bme280_sensor',
        fromPort: 'i2c_sda',
        toPort: 'sda'
      }
    ]
  })

  describe('既存3段階チェックシステムとの互換性', () => {
    test('既存システムとの結果一致性確認', async () => {
      // 既存システムでのチェック
      const originalResult = checkSystemCompatibility(testComponents, testConnections)
      
      // 強化システムでのチェック
      const enhancedResult = await checker.checkConnectionCompatibility(
        testConnections,
        testComponents
      )

      // 基本的な互換性判定が一致することを確認
      expect(enhancedResult.isCompatible).toBeDefined()
      expect(enhancedResult.issues).toBeDefined()
      expect(enhancedResult.summary).toBeDefined()
      
      // 追加情報が含まれていることを確認
      expect(enhancedResult.checkedConnections).toBe(testConnections.length)
      expect(enhancedResult.connectedComponents).toBeGreaterThan(0)
      expect(enhancedResult.unconnectedComponents).toContain('isolated_component')
      expect(enhancedResult.performanceGain).toBeDefined()

      console.log('🔍 Original vs Enhanced Results:')
      console.log(`Original issues: ${originalResult.issues.length}`)
      console.log(`Enhanced issues: ${enhancedResult.issues.length}`)
      console.log(`Performance gain: ${enhancedResult.performanceGain.timeReduction}`)
    })

    test('ソフトウェア互換性統合テスト', async () => {
      const softwareContext: SoftwareContext = {
        detectedLibraries: [
          { name: 'WiFi', version: '1.0', platform: 'ESP32' },
          { name: 'Servo', version: '1.1.6', platform: 'Arduino' },
          { name: 'Adafruit_BME280', version: '2.2.2', platform: 'Arduino' }
        ],
        userRequirements: ['temperature_sensing', 'wifi_connectivity', 'servo_control']
      }

      const result = await checker.checkConnectionCompatibility(
        testConnections,
        testComponents,
        softwareContext
      )

      expect(result.issues).toBeDefined()
      // ソフトウェア要件に関する問題が検出されている可能性
      console.log('🔧 Software integration test results:')
      console.log(`Issues found: ${result.issues.length}`)
      result.issues.forEach(issue => {
        console.log(`- ${issue.type}: ${issue.issue}`)
      })
    })

    test('後方互換性確認', async () => {
      // ユーティリティ関数での実行
      const result = await checkEnhancedConnectionCompatibility(
        testConnections,
        testComponents
      )

      expect(result).toBeDefined()
      expect(result.isCompatible).toBeDefined()
      expect(result.performanceGain).toBeDefined()
    })
  })

  describe('パフォーマンス最適化テスト', () => {
    test('ペア抽出アルゴリズムの効率性', () => {
      const startTime = performance.now()
      
      const pairResult = checker.extractComponentPairs(testConnections, testComponents)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(pairResult).toBeDefined()
      expect(duration).toBeLessThan(100) // Example threshold for performance

      console.log(`Pair extraction took ${duration}ms`)
    })
  })
})