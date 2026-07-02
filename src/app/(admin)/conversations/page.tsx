'use client'

import { useEffect, useState, ChangeEvent, KeyboardEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Message {
  id: number
  role: string
  content: string
  timestamp: string
}

interface Conversation {
  id: number
  phone: string
  name: string | null
  lastMessage: string
  lastActive: string
  messages: Message[]
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchConversations() {
    const res = await fetch('/api/conversations')
    const data = await res.json()
    setConversations(data)

    if (selectedConversation) {
      const updated = data.find((c: Conversation) => c.id === selectedConversation.id)
      if (updated) setSelectedConversation(updated)
    }
  }

  async function sendReply() {
    if (!selectedConversation || !replyMessage.trim()) return

    await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        phone: selectedConversation.phone,
        message: replyMessage,
      }),
    })

    setReplyMessage('')
    fetchConversations()
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      conv.phone.toLowerCase().includes(term) ||
      (conv.name && conv.name.toLowerCase().includes(term)) ||
      conv.lastMessage.toLowerCase().includes(term)
    )
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-3.5rem)] lg:h-screen flex gap-4 lg:gap-6">
      <div className={`w-full lg:w-96 flex-shrink-0 flex flex-col min-h-0 ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        <h1 className="text-3xl font-bold tracking-tight mb-6">Conversations</h1>

        <Card className="bg-[#0a0a0a] border-white/5 flex-1 min-h-0 overflow-hidden flex flex-col">
          <CardHeader className="p-4 border-b border-white/5">
            <Input
              placeholder="Search conversations..."
              className="bg-white/5 border-white/10"
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="text-zinc-500 text-center py-8 text-sm">No conversations yet</p>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">
                          {conv.name?.[0] || conv.phone.slice(-2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {conv.name || conv.phone}
                          </p>
                          <span className="text-xs text-zinc-500">
                            {formatTime(conv.lastActive)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={`flex-1 min-w-0 ${selectedConversation ? 'block' : 'hidden lg:block'}`}>
        {selectedConversation ? (
          <Card className="bg-[#0a0a0a] border-white/5 h-full flex flex-col">
            <CardHeader className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  aria-label="Back to conversations"
                  className="lg:hidden -ml-1 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold">
                    {selectedConversation.name?.[0] || selectedConversation.phone.slice(-2)}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation.name || selectedConversation.phone}
                  </CardTitle>
                  <p className="text-xs text-zinc-500">{selectedConversation.phone}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'ai' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.role === 'ai'
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'ai' ? 'text-zinc-500' : 'text-zinc-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>

            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={replyMessage}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setReplyMessage(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendReply()}
                  className="bg-white/5 border-white/10"
                />
                <Button
                  onClick={sendReply}
                  className="bg-white hover:bg-zinc-200 text-black font-medium"
                >
                  Send
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-[#0a0a0a] border-white/5 h-full flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a conversation to view messages</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
