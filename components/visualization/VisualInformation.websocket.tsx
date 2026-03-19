"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, CameraOff, Mic, MicOff, Loader2 } from "lucide-react"
import type { DebugContext, DebugChatMessage } from "@/types/debug"
import { useSocket } from "@/hooks/useSocket"

interface RealtimeEvent {
  type: string
  event_id?: string
  conversation_id?: string
  item?: any
  response?: any
  delta?: any
  audio?: ArrayBuffer
  session?: any // Added session property to fix errors
}

interface VisualInformationProps {
  projectId: string
  onMessageSend?: (message: any) => void
}

// Check browser support
function checkBrowserSupport() {
  const issues: string[] = []

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push('getUserMedia not supported')
  }

  if (!window.MediaRecorder) {
    issues.push('MediaRecorder not supported')
  }

  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    issues.push('AudioContext not supported')
  }

  if (!window.WebSocket) {
    issues.push('WebSocket not supported')
  }

  return {
    supported: issues.length === 0,
    issues
  }
}

export function VisualInformation({ projectId, onMessageSend }: VisualInformationProps) {
  // Socket.io接続
  const { socket, isConnected: socketConnected, emit, on, off } = useSocket({
    onConnect: () => {
      console.log('Socket.io connected')
      // Socket接続後にOpenAI接続を開始
      emit('openai-connect', {});
    },
    onDisconnect: () => {
      console.log('Socket.io disconnected')
      setIsConnected(false)
      setOpenAIConnected(false)
      setConnectionState('disconnected')
    },
    onError: (error: any) => { // Explicitly typed error as any
      console.error('Socket error:', error)
      setError('Connection error: ' + (error.message || 'Unknown error'))
    }
  })
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [openAIConnected, setOpenAIConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userVoicePrompt, setUserVoicePrompt] = useState<string>("")
  const [aiResponse, setAiResponse] = useState<string>("")
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 3
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
  const [isOnline, setIsOnline] = useState(true)
  const [offlineMessageQueue, setOfflineMessageQueue] = useState<Array<{ type: string; timestamp: number }>>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<any>(null) // Reference to track OpenAI connection state
  const audioContextRef = useRef<AudioContext | null>(null)
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // const lastVisionAnalysisRef = useRef<number>(0)
  const [visionDescription, setVisionDescription] = useState<string>("")
  const storedImagesRef = useRef<{ timestamp: number; base64: string }[]>([])
  const maxStoredImages = 60 // Store last 60 seconds of images (60 * 1 second)
  const aiResponseRef = useRef<string>("")
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const debugSessionIdRef = useRef<string | null>(null)
  // const audioQueueRef = useRef<AudioBufferSourceNode[]>([])
  // const isPlayingAudioRef = useRef<boolean>(false)
  const currentResponseIdRef = useRef<string | null>(null)
  const audioBuffersRef = useRef<ArrayBuffer[]>([])
  const isAISpeakingRef = useRef<boolean>(false)
  const sessionConfiguredRef = useRef<boolean>(false)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const noiseFloorRef = useRef<number>(0.01)  // Dynamic noise floor
  const noiseBufferRef = useRef<number[]>([])  // Buffer for noise level samples
  const maxNoiseBufferSize = 50  // Keep last 50 samples for noise floor calculation
  const audioDataSentRef = useRef<number>(0)  // Track amount of audio data sent
  const pendingResponseRef = useRef<boolean>(false)  // Track if we're waiting to create a response

  // Initialize WebRTC and WebSocket connection
  const startRealtimeSession = useCallback(async () => {
    try {
      setIsConnecting(true)
      setConnectionState('connecting')
      setError(null)

      // Get user media (webcam + microphone)
      let stream: MediaStream | null = null // Initialize stream as null
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: !isMuted ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,  // Disabled to prevent AGC from amplifying ambient noise
            sampleRate: 48000,  // Higher sample rate for better quality
            channelCount: 1,    // Mono for consistency
            latency: 0          // Low latency
          } : false
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream // Assign stream to ref
      } catch (mediaErr: any) {
        console.error('Media access error:', mediaErr)
        if (mediaErr.name === 'NotAllowedError') {
          setError('📷 Camera and microphone access denied. Please allow permissions in your browser settings and try again.')
        } else if (mediaErr.name === 'NotFoundError') {
          setError('🎤 No camera or microphone found. Please connect a device and try again.')
        } else if (mediaErr.name === 'NotReadableError') {
          setError('🔒 Camera or microphone is already in use by another application. Please close other apps and try again.')
        } else if (mediaErr.name === 'OverconstrainedError') {
          setError('⚙️ The specified constraints cannot be satisfied by any available device. Please adjust your settings and try again.')
        } else {
          setError('An unknown error occurred while accessing media devices.')
        }
        setIsConnecting(false)
        setConnectionState('disconnected')
        return
      }

      // WebSocket connection logic
      wsRef.current = new WebSocket(`wss://example.com/realtime?projectId=${projectId}`)
      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionState('connected')
        setIsConnecting(false)
        console.log('WebSocket connected')
      }
      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionState('disconnected')
        console.log('WebSocket disconnected')
      }
      wsRef.current.onerror = (event: Event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }
      wsRef.current.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        console.log('WebSocket message received:', data)
        if (data.type === 'response') {
          setAiResponse(data.message)
        }
      }
    } catch (err) {
      console.error('Error starting realtime session:', err)
      setError('Failed to start realtime session')
      setIsConnecting(false)
      setConnectionState('disconnected')
    }
  }, [projectId, selectedCameraId, isMuted])

  useEffect(() => {
    if (socketConnected) {
      startRealtimeSession()
    }
  }, [socketConnected, startRealtimeSession])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div>
      <h1>Visual Information</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <video ref={videoRef} autoPlay playsInline muted={isMuted} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button onClick={() => setIsWebcamOn(!isWebcamOn)}>
        {isWebcamOn ? <CameraOff /> : <Camera />}
      </button>
      <button onClick={() => setIsMuted(!isMuted)}>
        {isMuted ? <MicOff /> : <Mic />}
      </button>
      {isConnecting && <Loader2 />}
      <p>{aiResponse}</p>
    </div>
  )
}