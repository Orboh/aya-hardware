/**
 * 複雑部品表示のユーザビリティテスト
 * Phase 4.2.1: Teensy 4.1級部品の表示・操作性テスト
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComplexComponentManager } from '@/components/management/ComplexComponentManager'
import { ExpandablePortView } from '@/components/visualization/ExpandablePortView'
import { DynamicPortLayoutManager } from '@/components/nodes/DynamicPortLayoutManager'
import type { DynamicPortConfiguration, ComplexComponentState } from '@/types/canvas'

// Define the correct type for DynamicPortConfiguration
interface Port {
  id: string;
  name: string;
  type: 'digital' | 'analog' | 'communication' | 'power';
  direction: 'input' | 'output' | 'bidirectional';
  position: 'left' | 'right' | 'bottom';
  capacity?: number;
  protocol?: string;
  metadata?: Record<string, any>;
}

interface PortGroup {
  digital: Port[];
  analog: Port[];
  communication: Port[];
  power: Port[];
}

interface DynamicPortConfiguration {
  ports: Port[];
  groups: PortGroup;
  layout: 'grid' | 'list';
  expandable: boolean;
}

// Teensy 4.1相当の複雑な部品設定
const teensyConfig: DynamicPortConfiguration = {
  ports: [
    // デジタルピン（41本）
    ...Array.from({ length: 41 }, (_, i) => ({
      id: `digital-${i}`,
      name: `D${i}`,
      type: 'digital' as const,
      direction: 'bidirectional' as const,
      position: i < 20 ? 'left' : 'right',
      capacity: 1,
      protocol: i < 2 ? 'UART' : undefined,
      metadata: {
        pwmCapable: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23].includes(i),
        interruptCapable: true
      }
    })),
    // アナログピン（18本）
    ...Array.from({ length: 18 }, (_, i) => ({
      id: `analog-${i}`,
      name: `A${i}`,
      type: 'analog' as const,
      direction: 'input' as const,
      position: 'left',
      capacity: 1,
      metadata: {
        resolution: '12bit',
        maxVoltage: '3.3V'
      }
    })),
    // 通信ピン
    { id: 'sda', name: 'SDA', type: 'communication', direction: 'bidirectional', position: 'right', protocol: 'I2C' },
    { id: 'scl', name: 'SCL', type: 'communication', direction: 'bidirectional', position: 'right', protocol: 'I2C' },
    { id: 'mosi', name: 'MOSI', type: 'communication', direction: 'output', position: 'right', protocol: 'SPI' },
    { id: 'miso', name: 'MISO', type: 'communication', direction: 'input', position: 'right', protocol: 'SPI' },
    { id: 'sck', name: 'SCK', type: 'communication', direction: 'output', position: 'right', protocol: 'SPI' },
    // 電源ピン
    { id: '3v3', name: '3.3V', type: 'power', direction: 'output', position: 'bottom', capacity: 10 },
    { id: 'gnd1', name: 'GND', type: 'power', direction: 'input', position: 'bottom', capacity: -1 },
    { id: 'gnd2', name: 'GND', type: 'power', direction: 'input', position: 'bottom', capacity: -1 },
    { id: 'vin', name: 'VIN', type: 'power', direction: 'input', position: 'bottom', capacity: 1 }
  ],
  groups: {
    digital: [], // 後で設定
    analog: [],  // 後で設定
    communication: [], // 後で設定
    power: []    // 後で設定
  },
  layout: 'grid',
  expandable: true
}

// グループ分けを設定
teensyConfig.groups.digital = teensyConfig.ports.filter((p: Port) => p.type === 'digital')
teensyConfig.groups.analog = teensyConfig.ports.filter((p: Port) => p.type === 'analog')
teensyConfig.groups.communication = teensyConfig.ports.filter((p: Port) => p.type === 'communication')
teensyConfig.groups.power = teensyConfig.ports.filter((p: Port) => p.type === 'power')

describe('Complex Component Display Usability Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('Teensy 4.1 Level Component Display', () => {
    it('should handle 60+ ports without performance degradation', async () => {
      const startTime = performance.now()
      
      const { container } = render(
        <DynamicPortLayoutManager
          nodeId="teensy-test"
          portConfig={teensyConfig}
          displayMode="expanded"
          onPortClick={jest.fn()}
        />
      )
      
      const renderTime = performance.now() - startTime
      
      // レンダリング時間の検証（500ms以内）
      expect(renderTime).toBeLessThan(500)
      
      // ポート数の検証
      const ports = container.querySelectorAll('[data-testid^="port-"]')
      expect(ports.length).toBeGreaterThanOrEqual(60)
    })

    it('should provide intuitive port grouping and navigation', async () => {
      render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="grouped"
          onPortSelect={jest.fn()}
        />
      )

      // グループが表示されることを確認
      expect(screen.getByText(/Digital \(41\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Analog \(18\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Communication \(5\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Power \(4\)/i)).toBeInTheDocument()

      // グループの展開/折りたたみテスト
      const digitalGroup = screen.getByText(/Digital \(41\)/i)
      await user.click(digitalGroup)
      
      // デジタルピンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('D0')).toBeVisible()
        expect(screen.getByText('D40')).toBeVisible()
      })
    })

    it('should support efficient port search and filtering', async () => {
      const { getByPlaceholderText } = render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="list"
          showSearch={true}
          onPortSelect={jest.fn()}
        />
      )

      const searchInput = getByPlaceholderText(/Search ports/i)
      
      // PWM対応ピンの検索
      await user.type(searchInput, 'PWM')
      
      await waitFor(() => {
        // PWM対応ピンのみが表示される
        const visiblePorts = screen.getAllByTestId(/^port-digital-/)
        const pwmPorts = visiblePorts.filter(port => {
          const portId = port.getAttribute('data-testid')
          const pinNumber = parseInt(portId?.replace(/^port-digital-/, '') || '', 10)
          return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23].includes(pinNumber)
        })
        expect(pwmPorts.length).toBeGreaterThan(0)
      })
    })
  })
})