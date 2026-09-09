'use client';

import { useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
}

export function useChatStream({ agentId, leadId }: { agentId: string; leadId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', content: userText };
    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMsg: ChatMessage = { id: assistantMsgId, sender: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          leadId,
          messages: [...messages, userMsg].map((m) => ({ role: m.sender, content: m.content })),
        }),
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataPayload = line.replace('data: ', '').trim();

              if (dataPayload === '[DONE]') break;

              try {
                const { text } = JSON.parse(dataPayload);

                // Append stream token to last message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + text }
                      : msg
                  )
                );
              } catch (err) {
                // Ignore partial JSON chunks across buffers
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to read stream:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, sendMessage, isStreaming };
}
