/**
 * 要件検証テスト
 * 全要件に対する受入テスト
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnifiedCompatibilityChecker } from '@/utils/enhancedCompatibilityChecker'
import { AISpecificationService } from '@/utils/ai/core/aiSpecificationService'
import { DynamicPortSystem } from '@/utils/connections/ports/dynamicPortSystem'
import { UnconnectedPartsWarning } from '@/components/warnings/UnconnectedPartsWarning'
import { DirectionalityWarning } from '@/components/warnings/DirectionalityWarning'
import { IntegratedWarningPanel } from '@/components/warnings/IntegratedWarningPanel'
import type { NodeData, Connection } from '@/types'

describe('要件検証テスト', () => {
  describe('要件1: 設計書にコネクタ構成されていた部品同士の互換性チェック', () => {
    it('1.1: 接続されている部品ペアのみをチェック対象とする', async () => {
      const checker = new UnifiedCompatibilityChecker()
      const nodes = [
        { id: 'arduino', data: { title: 'Arduino Uno' } },
        { id: 'sensor1', data: { title: 'Temperature Sensor' } },
        { id: 'sensor2', data: { title: 'Humidity Sensor' } },
        { id: 'display', data: { title: 'OLED Display' } } // 未接続
      ]
      
      const connections: Connection[] = [
        { id: 'c1', fromId: 'arduino', toId: 'sensor1', fromPort: 'sda', toPort: 'sda' },
        { id: 'c2', fromId: 'arduino', toId: 'sensor2', fromPort: 'scl', toPort: 'scl' }
      ]
      
      const result = await checker.checkConnectionsCompatibility(nodes, connections)
      
      // displayは接続されていないのでチェック対象外
      expect(result.checks).toHaveLength(2)
      expect(result.checks.some((c: any) => c.components.includes('OLED Display'))).toBe(false)
    })

    it('1.2: 全部品の総当たりではなく、接続ペアのみチェック', async () => {
      const checker = new UnifiedCompatibilityChecker()
      const checkSpy = jest.spyOn(checker as any, 'checkPairCompatibility')
      
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node${i}`,
        data: { title: `Component ${i}` }
      }))
      
      const connections: Connection[] = [
        { id: 'c1', fromId: 'node0', toId: 'node1', fromPort: 'out', toPort: 'in' },
        { id: 'c2', fromId: 'node1', toId: 'node2', fromPort: 'out', toPort: 'in' }
      ]
      
      await checker.checkConnectionsCompatibility(nodes, connections)
      
      // 10部品の総当たりなら45回、接続ペアのみなら2回
      expect(checkSpy).toHaveBeenCalledTimes(2)
    })

    it('1.3: 大規模システムでのパフォーマンス最適化確認', async () => {
      const checker = new UnifiedCompatibilityChecker()
      
      // 100ノード、200接続のシステム
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node${i}`,
        data: { title: `Component ${i}`, specifications: { voltage: '5V' } }
      }))
      
      const connections: Connection[] = Array.from({ length: 200 }, (_, i) => ({
        id: `conn${i}`,
        fromId: `node${Math.floor(i / 2)}`,
        toId: `node${Math.floor(i / 2) + 1}`,
        fromPort: 'out',
        toPort: 'in'
      }))
      
      const startTime = performance.now()
      await checker.checkConnectionsCompatibility(nodes, connections)
      const elapsed = performance.now() - startTime
      
      // 200接続のチェックが1秒以内に完了
      expect(elapsed).toBeLessThan(1000)
    })
  })

  describe('要件2: AI検索による未登録部品仕様の取得', () => {
    const aiService = new AISpecificationService()
    
    beforeEach(() => {
      // AI APIのモック
      jest.spyOn(aiService as any, 'callOpenAI').mockResolvedValue({
        specifications: {
          voltage: '3.3V',
          communication: 'I2C,SPI,UART',
          gpio: 32,
          analog: 8
        },
        confidence: 0.92
      })
    })

    it('2.1: OpenAI APIによる電子部品仕様検索', async () => {
      const result = await aiService.searchComponentSpecification('ESP32 DevKit')
      
      expect(result.specifications).toBeDefined()
      expect(result.specifications.voltage).toBe('3.3V')
      expect(result.specifications.communication).toContain('I2C')
    })

    it('2.2: 信頼度スコアによる結果検証', async () => {
      const result = await aiService.searchComponentSpecification('Custom Sensor XYZ')
      
      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('2.5: 信頼性表示（信頼度スコア・情報源URL）', async () => {
      const result = await aiService.searchComponentSpecification('Arduino Uno')
      
      expect(result.sources).toBeDefined()
      expect(result.sources.length).toBeGreaterThan(0)
      expect(result.sources[0]).toHaveProperty('type')
      expect(result.sources[0]).toHaveProperty('url')
      expect(result.sources[0]).toHaveProperty('reliability')
    })

    it('2.6: 結果キャッシュシステム', async () => {
      const component = 'Raspberry Pi 4'
      
      // 初回検索
      const result1 = await aiService.searchComponentSpecification(component)
      const callCount1 = (aiService as any).callOpenAI.mock.calls.length
      
      // 2回目検索（キャッシュから）
      const result2 = await aiService.searchComponentSpecification(component)
      const callCount2 = (aiService as any).callOpenAI.mock.calls.length
      
      expect(result1).toEqual(result2)
      expect(callCount2).toBe(callCount1) // API呼び出し回数が増えていない
    })

    it('2.8: 手動確認オプション', () => {
      // ManualAISearchコンポーネントの存在確認
      const ManualAISearch = require('@/components/ManualAISearch').default
      expect(ManualAISearch).toBeDefined()
    })
  })

  describe('要件3: 未接続部品の警告', () => {
    it('3.1: 部品リストと接続情報の比較', () => {
      const nodes = [
        { id: 'n1', data: { title: 'Arduino' } },
        { id: 'n2', data: { title: 'Sensor' } },
        { id: 'n3', data: { title: 'Display' } }
      ]
      
      const connections: Connection[] = [
        { id: 'c1', fromId: 'n1', toId: 'n2' }
      ]
      
      render(
        <UnconnectedPartsWarning
          nodes={nodes}
          connections={connections}
          delay={0}
        />
      )
    })
  })
})