'use client'

import { useCallback, useState } from 'react'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'

export type AiChatRole = 'user' | 'ai'

export interface AiChatMessage {
  role: AiChatRole
  text: string
  loading?: boolean
}

export function useAiChat() {
  const [isAsking, setIsAsking] = useState(false)

  const postQuestion = useCallback(
    async (opts: { question: string; stockItems: string[]; cartContext?: string }) => {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const body = {
        question: opts.cartContext ? `${opts.cartContext}\n\nSorum: ${opts.question}` : opts.question,
        stock_items: opts.stockItems,
      }
      const res = await axios.post('/api/chat/question', body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      return (res.data?.answer as string) || 'Yanıt alınamadı.'
    },
    []
  )

  return { postQuestion, isAsking, setIsAsking }
}
