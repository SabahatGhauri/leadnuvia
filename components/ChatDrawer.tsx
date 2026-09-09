'use client';

import React, { useState } from 'react';
import ChatCalEmbed from './ChatCalEmbed';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  showCalEmbed?: boolean;
}

export default function ChatDrawer({ agentConfig }: { agentConfig: any }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      content: 'Hello! Ask me anything about our product pricing, features, or roadmap.',
    },
  ]);
  const [booked, setBooked] = useState(false);

  // Example handler when assistant response triggers high-intent criteria
  const handleIncomingAssistantResponse = (text: string, currentIntentScore: number) => {
    const isHighIntent = currentIntentScore >= 70;

    const newAssistantMessage: Message = {
      id: Date.now().toString(),
      sender: 'assistant',
      content: text,
      showCalEmbed: isHighIntent && !booked, // Inject calendar if score > 70
    };

    setMessages((prev) => [...prev, newAssistantMessage]);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 text-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div
              className={`p-3 rounded-xl max-w-[85%] ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white ml-auto'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {msg.content}
            </div>

            {/* DYNAMIC CALENDAR INJECTION */}
            {msg.showCalEmbed && agentConfig.cal_embed_url && (
              <ChatCalEmbed
                calLink={agentConfig.cal_embed_url} // e.g. "acme/demo"
                visitorEmail="visitor@client.com"
                onBookingSuccess={() => {
                  setBooked(true);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      sender: 'assistant',
                      content: '🎉 Perfect! Your demo has been scheduled. Check your inbox for calendar invites.',
                    },
                  ]);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
