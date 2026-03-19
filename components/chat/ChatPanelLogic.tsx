'use client';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from '@/utils/debounce';
import { ChatStreamHandler } from '@/utils/chat/streamHandler';
import type { NodeData, Connection, ChatMessage, Project } from '@/types';
import type { Node } from '@xyflow/react';
import type { Session } from 'next-auth';
import type {
  PartSuggestion,
  AlternativePart,
} from '@/utils/components/alternativePartsFinder';
import { checkSystemCompatibility } from '@/utils/connections/validation/unifiedCompatibilityChecker';
// import { generateSmartPBSStructure } from '@/utils/project/smartGrouping'
// import {
//   extractComponentSuggestions,
//   extractSystemSuggestions,
//   convertSuggestionToNode,
//   convertSystemToNodes,
//   convertSystemToConnections,
//   calculateSuggestionPosition,
//   calculateSystemPosition,
//   getPendingComponentsCount
// } from '@/utils/ai/processing/componentSuggestionExtractor'
import { RequirementsDefManager } from '@/lib/managers/RequirementsDefManager';
// 質問生成機能 - AIベースの実装が完了するまで一時的に無効化
// TODO: AIベースの動的質問生成機能を実装後、コメントアウトを解除
import { QuestionGenerationEngine } from '@/lib/ai/questionGenerator';
import { SystemSuggestionManager } from '@/lib/managers/SystemSuggestionManager';
import { SoftwarePromptGenerator } from '@/lib/ai/softwarePromptGenerator';
import {
  extractStructuredDataFromResponse,
  convertStructuredDataToMarkdown,
  convertMarkdownToTiptap,
} from '@/lib/utils/markdownToTiptap';
import { detectLanguage } from '@/utils/language/languageDetector';
// import { findAlternativeParts } from '@/utils/components/alternativePartsFinder' // 一時的にコメントアウト

// 翻訳関数（chat.tsと同じロジック）
async function translateToEnglish(text: string): Promise<string> {
  console.log('🔤 Starting translation for:', text.substring(0, 50) + '...');

  // 英語の文字、数字、句読点のみで構成されているかチェック
  const englishPattern = /^[a-zA-Z0-9\s.,!?'"()\[\]{}\-_:;@#$%^&*+=<>/\\|`~]+$/;
  if (englishPattern.test(text.trim())) {
    console.log('🔤 Text is already in English, skipping translation');
    return text; // 既に英語の場合はそのまま返す
  }

  try {
    // タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒のタイムアウト

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    console.log('🔤 Translation successful');
    return data.translatedText || text;
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.error('Translation timeout after 30 seconds');
    } else {
      console.error('Translation error:', error);
    }
    return text; // フォールバック：翻訳に失敗した場合は元のテキストを使用
  }
}

// ChatPanelビジネスロジック専用フック
export function useChatPanelLogic({
  nodes,
  connections,
  // setNodes,
  // setConnections,
  chatMessages,
  setChatMessages,
  currentProject,
  addSuggestion,
  handleSendMessage,
  chatMode,
  session,
}: {
  nodes: Node<NodeData>[];
  connections: Connection[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentProject: Project | null;
  addSuggestion: (suggestion: PartSuggestion) => void;
  handleSendMessage: (
    message: string | ChatMessage,
    files?: FileList | null,
    skipAnalysis?: boolean,
  ) => Promise<void>;
  chatMode?: 'normal' | 'requirements';
  session?: Session | null;
}) {
  // State for requirements dialogue tracking
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(
    null,
  );
  // 質問管理用ステート - AIベースの実装まで無効化
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  // State for system suggestion tracking
  const [latestSystemSuggestion, setLatestSystemSuggestion] = useState<{
    systemId: string;
    components: Array<{ id: string; name: string }>;
    connections: Array<{ from: string; to: string }>;
  } | null>(null);
  const [softwarePromptGenerated, setSoftwarePromptGenerated] = useState(false);

  // 代替部品の提案チェック
  const checkAndSuggestAlternatives = useCallback(async () => {
    if (nodes.length === 0) return;

    try {
      for (const node of nodes) {
        if (node.data.title && node.data.description) {
          // 🚀 React Flow完全移行: 代替部品提案のモックデータ生成（React Flow Node型対応）
          const mockAlternatives: AlternativePart[] = [
            {
              id: `alt-${node.id}-1`,
              title: `${node.data.title} Pro`,
              modelNumber: `${node.data.modelNumber || 'MODEL'}-PRO`,
              voltage: node.data.voltage,
              communication: node.data.communication,
              description: `Enhanced version of ${node.data.title}`,
              category: 'upgraded',
              compatibilityScore: 95,
              priceEstimate: '$25-35',
              advantages: ['Better performance', 'Lower power consumption'],
              tradeoffs: ['Slightly higher cost'],
            },
          ];

          if (mockAlternatives.length > 0) {
            const suggestion: PartSuggestion = {
              problemComponentId: node.id,
              problemComponentName: node.data.title,
              issue: {
                componentId: node.id,
                componentName: node.data.title,
                issue: 'Performance optimization opportunity',
                severity: 'warning' as const,
                recommendation:
                  'Consider alternative parts for better performance and cost',
                type: 'compatibility',
                affected
// ... truncated ...