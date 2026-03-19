"use client"

import type React from "react"
import { Settings, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  handleNewChat,
  toggleThreadPin,
  handleSelectThread,
  startNewEmptyChat
} from '@/utils/chat/chatUtils'
import type {
  ChatMessage,
  LLMStatus,
  HardwareContextStatus,
  FailedConnection,
  NodeData,
  UploadStatus
} from '@/types'
import type { Node } from '@xyflow/react'
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder'
import SuggestionCard from '@/components/cards/SuggestionCard'
import SuggestionModal from '@/components/modals/SuggestionModal'
import { FileUpload } from '@/components/management/FileUpload'

// ChatPanelUI専用のProps型定義
interface ChatPanelUIProps {
  // 基本的なチャット状態
  chatMessages: ChatMessage[]
  chatThreads: { id: string; name: string; messages: ChatMessage[]; isPinned?: boolean; lastUpdated?: string }[]
  currentMessage: string
  setCurrentMessage: React.Dispatch<React.SetStateAction<string>>
  isChatActive: boolean
  currentThreadId: string | null
  showThreads: boolean
  llmStatus: LLMStatus
  hardwareContextStatus: HardwareContextStatus
  failedConnections: FailedConnection[]
  nodes: Node<NodeData>[]
  
  // ファイル関連
  selectedFiles: File[]
  uploadStatus: UploadStatus
  filePreviewUrls: Record<string, string>
  handleFileSelect: (files: FileList) => void
  clearFiles: () => void
  
  // 状態管理から取得
  panelRef: React.RefObject<HTMLDivElement>
  suggestions: PartSuggestion[]
  selectedSuggestion: PartSuggestion | null
  showSuggestionModal: boolean
  activeTab: 'context' | 'images'
  dynamicStyles: {
    messageMaxWidth: string
    contentPadding: string
    visualPadding: string
    fontSize: string
    iconSize: string
  }
  
  // アクション関数
  setChatThreads: React.Dispatch<React.SetStateAction<{ id: string; name: string; messages: ChatMessage[]; isPinned?: boolean; lastUpdated?: string }[]>>
  setShowThreads: React.Dispatch<React.SetStateAction<boolean>>
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setCurrentThreadId: React.Dispatch<React.SetStateAction<string | null>>
  setIsChatActive: React.Dispatch<React.SetStateAction<boolean>>
  setActiveTab: (tab: 'context' | 'images') => void
  openSuggestionModal: (suggestion: PartSuggestion) => void
  closeSuggestionModal: () => void
  handleExtendedSendMessage: (message: string, files?: FileList | null) => Promise<void>
  handleAcceptSuggestion: (suggestionId: string, alternativeId: string) => Promise<void>
}

// ChatPanel UI表示専用コンポーネント
export function ChatPanelUI({
  chatMessages,
  chatThreads,
  currentMessage,
  setCurrentMessage,
  isChatActive,
  currentThreadId,
  showThreads,
  llmStatus,
  // hardwareContextStatus,
  // failedConnections,
  // nodes,
  selectedFiles,
  uploadStatus,
  filePreviewUrls,
  handleFileSelect,
  clearFiles,
  panelRef,
  suggestions,
  selectedSuggestion,
  showSuggestionModal,
  activeTab,
  dynamicStyles,
  setChatThreads,
  setShowThreads,
  setChatMessages,
  setCurrentThreadId,
  setIsChatActive,
  setActiveTab,
  openSuggestionModal,
  closeSuggestionModal,
  handleExtendedSendMessage,
  handleAcceptSuggestion
}: ChatPanelUIProps) {

  // 提案の拒否処理
  const handleRejectSuggestion = (suggestionId: string) => {
    // 実装は親コンポーネントで行う
    console.log('Rejecting suggestion:', suggestionId)
  }

  return (
    <div ref={panelRef} className="flex flex-col h-full min-h-0 w-full">
      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {/* Chat Header */}
        <div className="border-b bg-muted/30">
          <div className={`${dynamicStyles.contentPadding} py-2 flex items-center justify-between`}>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-t-lg border border-b-0 text-sm ${llmStatus.isRunning ? 'bg-blue-50 border-blue-200' : 'bg-background'}`}>
              <div className={`w-2 h-2 rounded-full ${llmStatus.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className={llmStatus.isRunning ? 'text-blue-700 font-medium' : ''}>
                @Builder with AYA {llmStatus.isRunning && `- ${llmStatus.currentTask}`}
              </span>
            </div>
            {isChatActive && (
              <Button variant="ghost" size="sm" onClick={() => handleNewChat(isChatActive, chatMessages, currentThreadId, setChatThreads, setShowThreads, showThreads)} className="text-xs">
                New Chat
              </Button>
            )}
          </div>
        </div>

        {showThreads ? (
          <>
            {/* Chat Threads List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`${dynamicStyles.contentPadding} py-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm">Chat History</h3>
                  <Button variant="ghost" size="sm" onClick={() => startNewEmptyChat(setChatMessages, setIsChatActive, setCurrentMessage, setCurrentThreadId, setShowThreads)} className="text-xs">
                    + New Chat
                  </Button>
                </div>
                
                {chatThreads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatThreads
                      .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1
                        if (!a.isPinned && b.isPinned) return 1
                        return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
                      })
                      .map((thread) => (
                      <div
                        key={thread.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative"
                        onClick={() => handleSelectThread(thread.id, setCurrentThreadId, setChatMessages, setIsChatActive, setShowThreads)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{thread.name}</p>
                            <p className="text-xs text-muted-foreground">{thread.messages.length} messages</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); toggleThreadPin(thread.id, chatThreads, setChatThreads) }}>
                              {thread.isPinned ? <PinOff size={dynamicStyles.iconSize} /> : <Pin size={dynamicStyles.iconSize} />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`${dynamicStyles.contentPadding} py-4`}>
                {chatMessages.map((message, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-muted rounded-full"></div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm">
                          <span className="font-medium">{message.sender}</span>
                          <span className="text-muted-foreground"> - {new Date(message.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="mt-1 text-sm">
                          <p>{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Message Input */}
            <div className="border-t bg-muted/30">
              <div className={`${dynamicStyles.contentPadding} py-2 flex items-center`}>
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                  placeholder="Type a message..."
                />
                <Button variant="ghost" size="sm" onClick={() => handleExtendedSendMessage(currentMessage, null)} className="text-xs">
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}