import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Reply } from '../features/conversation'
import { useWorkspace } from './workspaceContext'

export type Turn = { id: number; message: string; reply?: Reply }
type Conversation = {
  turns: Turn[]
  start: (message: string) => { signal: AbortSignal; finish: (reply?: Reply) => void } | null
  reset: () => void
}
const Context = createContext<Conversation | null>(null)

function ChatMemory({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const request = useRef<AbortController | null>(null)
  const serial = useRef(0)
  useEffect(() => () => { request.current?.abort() }, [])

  function reset() {
    request.current?.abort()
    request.current = null
    setTurns([])
  }

  function start(message: string) {
    if (request.current) return null
    const controller = new AbortController()
    const id = ++serial.current
    request.current = controller
    setTurns((previous) => [...previous.slice(-7), { id, message }])
    return {
      signal: controller.signal,
      finish(reply?: Reply) {
        if (request.current !== controller || controller.signal.aborted) return
        request.current = null
        setTurns((previous) => reply ? previous.map((turn) => turn.id === id ? { ...turn, reply } : turn) : previous.filter((turn) => turn.id !== id))
      },
    }
  }

  return <Context.Provider value={{ turns, reset, start }}>{children}</Context.Provider>
}

export function ChatSession({ children }: { children: ReactNode }) {
  const { session } = useWorkspace()
  return <ChatMemory key={session?.user.id ?? 'guest'}>{children}</ChatMemory>
}

export function useChatSession() {
  const chat = useContext(Context)
  if (!chat) throw new Error('ChatSession no disponible')
  return chat
}
