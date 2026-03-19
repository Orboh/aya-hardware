// 🔍 代替部品検索機能
// 第2段階：互換性問題のある部品に対して代替可能な部品を提案

import type { Node, Connection, NodeData, CanvasNode } from '@/types'
import { checkSystemCompatibility, type CompatibilityIssue } from '../connections/validation/unifiedCompatibilityChecker'

// 代替部品の候補情報
export interface AlternativePart {
  id: string
  title: string
  modelNumber?: string
  voltage?: string
  communication?: string
  description?: string
  category: string
  compatibilityScore: number  // 0-100の互換性スコア
  priceEstimate?: string
  advantages: string[]        // この代替部品の利点
  tradeoffs: string[]        // この代替部品のトレードオフ
}

// 代替部品の提案情報
export interface PartSuggestion {
  problemComponentId: string
  problemComponentName: string
  issue: CompatibilityIssue
  alternatives: AlternativePart[]
  recommendation: string
}

/**
 * 🎯 メイン関数：互換性問題に対する代替部品を検索
 */
export function findAlternativeParts(
  components: Node<NodeData>[],
  connections: Connection[],
  compatibilityIssues: CompatibilityIssue[]
): PartSuggestion[] {
  const suggestions: PartSuggestion[] = []
  
  // 重要度の高い問題から処理
  const criticalIssues = compatibilityIssues
    .filter(issue => issue.severity === 'critical')
    .slice(0, 3) // 最大3件まで
  
  criticalIssues.forEach(issue => {
    const problemComponent = components.find(c => c.id === issue.componentId)
    if (!problemComponent) return
    
    const alternatives = searchCompatibleAlternatives(
      problemComponent,
      issue,
      components,
      connections
    )
    
    if (alternatives.length > 0) {
      suggestions.push({
        problemComponentId: issue.componentId,
        problemComponentName: issue.componentName,
        issue,
        alternatives: alternatives.slice(0, 3), // 最大3つの代替案
        recommendation: generateRecommendation(issue, alternatives[0])
      })
    }
  })
  
  return suggestions
}

/**
 * 🔍 互換性のある代替部品を検索
 */
function searchCompatibleAlternatives(
  problemComponent: CanvasNode,
  issue: CompatibilityIssue,
  allComponents: Node<NodeData>[],
  connections: Connection[]
): AlternativePart[] {
  const alternatives: AlternativePart[] = []
  
  // 部品カテゴリを判定
  const category = detectComponentCategory(problemComponent)
  
  // カテゴリ別の代替部品候補を生成
  const candidates = generateAlternativeCandidates(problemComponent, issue, category)
  
  // 各候補の互換性をチェック
  candidates.forEach(candidate => {
    const testComponents = allComponents.map(c => 
      c.id === problemComponent.id ? createTestComponent(candidate) : c
    )
    
    const compatibilityResult = checkSystemCompatibility(testComponents, connections)
    
    // この代替部品が問題を解決するかチェック
    const solvesIssue = !compatibilityResult.issues.some(i => 
      i.type === issue.type && i.componentId === candidate.id
    )
    
    if (solvesIssue) {
      alternatives.push({
        ...candidate,
        compatibilityScore: calculateCompatibilityScore(candidate, problemComponent, compatibilityResult)
      })
    }
  })
  
  // 互換性スコア順にソート
  return alternatives.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
}

/**
 * 🏷️ 部品カテゴリを検出
 */
function detectComponentCategory(component: CanvasNode): string {
  const title = component.data?.title.toLowerCase()
  
  if (title.includes('arduino') || title.includes('microcontroller')) return 'controller'
  if (title.includes('sensor') || title.includes('温度') || title.includes('distance')) return 'sensor'
  if (title.includes('motor') || title.includes('servo')) return 'actuator'
  if (title.includes('led') || title.includes('display')) return 'display'
  if (title.includes('power') || title.includes('battery')) return 'power'
  if (title.includes('wifi') || title.includes('bluetooth')) return 'communication'
  
  return 'other'
}

/**
 * 🎲 代替部品候補を生成
 */
function generateAlternativeCandidates(
  problemComponent: CanvasNode,
  issue: CompatibilityIssue,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const candidates: Omit<AlternativePart, 'compatibilityScore'>[] = []
  
  switch (issue.type) {
    case 'voltage_mismatch':
      candidates.push(...generateVoltageAlternatives(problemComponent, category))
      break
    case 'communication_incompatible':
      candidates.push(...generateCommunicationAlternatives(problemComponent, category))
      break
    case 'power_insufficient':
      candidates.push(...generatePowerAlternatives(problemComponent, category))
      break
    default:
      candidates.push(...generateGeneralAlternatives(problemComponent, category))
  }
  
  return candidates
}

/**
 * ⚡ 電圧問題の代替部品を生成
 */
function generateVoltageAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const currentVoltage = component.data?.voltage
  const alternatives: Omit<AlternativePart, 'compatibilityScore'>[] = []
  
  // 一般的な電圧レベルでの代替案
  const commonVoltages = ['3.3V', '5V', '12V']
  
  commonVoltages.forEach(voltage => {
    if (voltage !== currentVoltage) {
      alternatives.push({
        id: `${component.id}_alt_${voltage}`,
        title: `${component.data?.title} (${voltage}版)`,
        voltage,
        communication: component.data?.communication,
        description: `${voltage}動作版の${component.data?.title}`,
        category,
        advantages: [`${voltage}動作で互換性向上`],
        tradeoffs: currentVoltage ? [`${currentVoltage}から${voltage}への変更`] : []
      })
    }
  })
  
  return alternatives
}

/**
 * 📡 通信問題の代替部品を生成
 */
function generateCommunicationAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const alternatives: Omit<AlternativePart, 'compatibilityScore'>[] = []
  const commonProtocols = ['I2C', 'SPI', 'UART', 'WiFi', 'Bluetooth']
  
  commonProtocols.forEach(protocol => {
    if (!component.data?.communication?.includes(protocol)) {
      alternatives.push({
        id: `${component.id}_alt_${protocol}`,
        title: `${component.data?.title} (${protocol}版)`,
        voltage: component.data?.voltage,
        communication: protocol,
        description: `${protocol}対応版の${component.data?.title}`,
        category,
        advantages: [`${protocol}通信で互換性向上`],
        tradeoffs: component.data?.communication ? [`${component.data.communication}から${protocol}への変更`] : []
      })
    }
  })
  
  return alternatives
}