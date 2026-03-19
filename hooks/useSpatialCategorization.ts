import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Node } from '@xyflow/react'
import type { NodeData, CategoryNodeData } from '@/types'

interface UseSpatialCategorizationProps {
  nodes: Node<NodeData>[]
  updateNode: (nodeId: string, newData: Partial<NodeData>) => void
}

/**
 * 空間的カテゴリ自動分類フック
 * カテゴリの枠内に部品が入ったかどうかを判定し、自動的に categoryId を設定
 */
export const useSpatialCategorization = ({ 
  nodes, 
  updateNode 
}: UseSpatialCategorizationProps) => {
  const [localCategoryPreview, setLocalCategoryPreview] = useState<{[key: string]: string | null}>({})
  /**
   * ノードがカテゴリの範囲内にあるかを判定（境界ボックス + 重複面積）
   */
  const isNodeInBounds = useCallback((
    nodePosition: { x: number; y: number }, 
    bounds: { x: number; y: number; width: number; height: number },
    nodeWidth: number = 240,  // 実際のノード幅（SystemNodeの幅）
    nodeHeight: number = 120  // 実際のノード高さ
  ): { isInBounds: boolean; overlapRatio: number } => {
    // ノードの境界ボックス
    const nodeBounds = {
      left: nodePosition.x,
      top: nodePosition.y,
      right: nodePosition.x + nodeWidth,
      bottom: nodePosition.y + nodeHeight
    }
    
    // カテゴリの境界ボックス
    const categoryBounds = {
      left: bounds.x,
      top: bounds.y,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height
    }
    
    // 重複領域の計算
    const overlapLeft = Math.max(nodeBounds.left, categoryBounds.left)
    const overlapTop = Math.max(nodeBounds.top, categoryBounds.top)
    const overlapRight = Math.min(nodeBounds.right, categoryBounds.right)
    const overlapBottom = Math.min(nodeBounds.bottom, categoryBounds.bottom)
    
    // 重複がない場合
    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
      return { isInBounds: false, overlapRatio: 0 }
    }
    
    // 重複面積の計算
    const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
    const nodeArea = nodeWidth * nodeHeight
    const overlapRatio = overlapArea / nodeArea
    
    // 50%以上重複している場合にカテゴライズ
    const isInBounds = overlapRatio >= 0.5
    
    return { isInBounds, overlapRatio }
  }, [])
  
  /**
   * カテゴリメンバーシップを更新（バッチ更新対応）
   * 依存関係を安定化してループを防止
   */
  const updateCategoryMembership = useCallback((currentNodes?: Node<NodeData>[]) => {
    const nodeList = currentNodes || nodes
    
    // カテゴリノードと部品ノードを分類
    const categoryNodes = nodeList.filter(n => n.data?.nodeType === 'category') as Node<CategoryNodeData>[]
    const partNodes = nodeList.filter(n => n.data?.nodeType !== 'category')
    
    if (categoryNodes.length === 0 || partNodes.length === 0) {
      return // カテゴリまたは部品が存在しない場合は何もしない
    }
    
    // 各部品について、どのカテゴリに属するかを判定（優先度付き）
    const partCategoryAssignments = new Map<string, { categoryId: string; overlapRatio: number }>()
    
    partNodes.forEach(part => {
      let bestMatch: { categoryId: string; overlapRatio: number } | null = null
      
      categoryNodes.forEach(category => {
        // React Flow座標系から正確なboundsを取得
        const bounds = category.data.bounds || {
          x: category.position?.x || 0,
          y: category.position?.y || 0,
          width: 300,
          height: 200
        }
        
        const result = isNodeInBounds(part.position, bounds)
        
        // 50%以上重複している場合のみ考慮
        if (result.isInBounds && (!bestMatch || result.overlapRatio > bestMatch.overlapRatio)) {
          bestMatch = {
            categoryId: category.id,
            overlapRatio: result.overlapRatio
          }
        }
      })
      
      if (bestMatch) {
        partCategoryAssignments.set(part.id, bestMatch)
      }
    })
    
    // バッチ更新用の配列
    const batchUpdates: Array<{ nodeId: string; newData: Partial<NodeData> }> = []
    
    // 各カテゴリのメンバーリストを更新
    categoryNodes.forEach(category => {
      const membersInBounds = partNodes.filter(part => {
        const assignment = partCategoryAssignments.get(part.id)
        return assignment && assignment.categoryId === category.id
      })
      
      // カテゴリのメンバーリスト更新
      const newMemberIds = membersInBounds.map(m => m.id)
      if (JSON.stringify(category.data.memberNodes) !== JSON.stringify(newMemberIds)) {
        batchUpdates.push({
          nodeId: category.id,
          newData: {
            memberNodes: newMemberIds
          }
        })
      }
      
      // 部品側のカテゴリID更新
      membersInBounds.forEach(member => {
        const assignment = partCategoryAssignments.get(member.id)
        if (member.data.categoryId !== category.id && assignment?.categoryId === category.id) {
          // カテゴリのboundsを取得
          const categoryBounds = category.data.bounds || {
            x: category.position?.x || 0,
            y: category.position?.y || 0,
            width: 300,
            height: 200
          }
          
          // カテゴリ内での相対位置を計算・記録
          const relativePosition = {
            x: member.position.x - categoryBounds.x,
            y: member.position.y - categoryBounds.y
          }
          
          batchUpdates.push({
            nodeId: member.id,
            newData: {
              categoryId: category.id,
              nodeType: 'part',
              relativePosition: relativePosition
            }
          })
        }
      })
    })
    
    // カテゴリ範囲外の部品のカテゴリIDをクリア
    partNodes.forEach(part => {
      if (part.data.categoryId && !partCategoryAssignments.has(part.id)) {
        batchUpdates.push({
          nodeId: part.id,
          newData: {
            categoryId: undefined,
            relativePosition: undefined
          }
        })
      }
    })
    
    // バッチ更新を一度に実行（状態競合回避）
    if (batchUpdates.length > 0) {
      batchUpdates.forEach(update => {
        updateNode(update.nodeId, update.newData)
      })
    }
  }, [updateNode, isNodeInBounds]) // nodes依存関係を削除
  
  /**
   * カテゴリ全体を移動（カテゴリ内の部品も一緒に移動）
   */
  const moveCategoryWithMembers = useCallback((
    categoryId: string, 
    delta: { x: number; y: number }
  ) => {
    console.log(`🚀 Moving category ${categoryId} with delta`, delta)
    const categoryNode = nodes.find(n => n.id === categoryId) as Node<CategoryNodeData> | undefined
    if (!categoryNode) return
    
    const categoryBounds = categoryNode.data.bounds || {
      x: categoryNode.position?.x || 0,
      y: categoryNode.position?.y || 0,
      width: 300,
      height: 200
    }
    
    const newBounds = {
      x: categoryBounds.x + delta.x,
      y: categoryBounds.y + delta.y,
      width: categoryBounds.width,
      height: categoryBounds.height
    }
    
    updateNode(categoryId, { bounds: newBounds })
    
    const members = nodes.filter(n => n.data?.categoryId === categoryId)
    members.forEach(member => {
      const newPosition = {
        x: member.position.x + delta.x,
        y: member.position.y + delta.y
      }
      updateNode(member.id, { position: newPosition })
    })
  }, [nodes, updateNode])
  
  useEffect(() => {
    updateCategoryMembership()
  }, [nodes, updateCategoryMembership])
  
  return {
    localCategoryPreview,
    setLocalCategoryPreview,
    moveCategoryWithMembers
  }
}