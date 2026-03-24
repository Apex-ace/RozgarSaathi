// (Now AI Financial Advisor)

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

function AITutor() {
  // Initialize messages from localStorage or use default
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('ai_advisor_chat');
    return savedMessages ? JSON.parse(savedMessages) : [
      {
        content: "Hello! I'm your AI Financial Advisor. Ask me anything about budgeting, investing, or managing debt.",
        role: 'assistant'
      }
    ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai_advisor_chat', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 1. Check for logged-in user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to chat!");
      return;
    }

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2. Call the new finance endpoint securely
      const response = await fetch(`${API_BASE_URL}/chat_with_advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // <-- Security Token
        },
        body: JSON.stringify({
          message: userMsg.content,
          user_context: "General User"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to connect or unauthorized.");
      }

      const data = await response.json();

      if (data.reply && data.reply.startsWith("Sorry, my financial data stream")) {
        throw new Error(data.reply);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Unable to respond right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const defaultMsg = [{ role: 'assistant', content: "Chat cleared. How can I help you next?" }];
    setMessages(defaultMsg);
    localStorage.setItem('ai_advisor_chat', JSON.stringify(defaultMsg));
    toast.success("Chat cleared.");
  };

  const ui = {
    shell: {
      minHeight: '100vh',
      background:
        'radial-gradient(1000px 500px at 20% 0%, rgba(13,148,136,0.10), transparent 55%), radial-gradient(900px 600px at 90% 20%, rgba(37,99,235,0.10), transparent 55%), #F6F7FB',
      fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: '#0F172A',
      padding: '0px',
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center'
    },
    phoneFrame: {
      width: '100%',
      maxWidth: 520,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
      borderLeft: '1px solid rgba(226,232,240,0.9)',
      borderRight: '1px solid rgba(226,232,240,0.9)',
      boxShadow: '0 12px 40px rgba(15,23,42,0.10)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 14px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    headLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    headIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      background: 'rgba(13,148,136,0.10)',
      border: '1px solid rgba(13,148,136,0.22)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    headTitle: { margin: 0, fontSize: '1.05rem', fontWeight: 950, lineHeight: 1.1 },
    headSub: { display: 'block', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginTop: 2 },
    clearBtn: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      color: '#0F172A',
      width: 40,
      height: 40,
      borderRadius: 14,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
      transition: 'transform 120ms ease'
    },
    chatWrap: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    chat: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 14px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: '#F8FAFC'
    },
    row: (isUser) => ({
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end',
      gap: 8
    }),
    avatar: (isUser) => ({
      width: 32,
      height: 32,
      borderRadius: 12,
      background: isUser ? 'rgba(13,148,136,0.10)' : '#FFFFFF',
      border: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }),
    bubble: (isUser) => ({
      maxWidth: '78%',
      padding: '10px 12px',
      borderRadius: 16,
      background: isUser ? '#0D9488' : '#FFFFFF',
      border: isUser ? '1px solid rgba(13,148,136,0.35)' : '1px solid #E2E8F0',
      color: isUser ? '#FFFFFF' : '#0F172A',
      boxShadow: '0 10px 18px rgba(15,23,42,0.06)',
      fontSize: '0.98rem',
      lineHeight: 1.45,
      fontWeight: 650,
      wordBreak: 'break-word'
    }),
    typing: {
      padding: '10px 12px',
      borderRadius: 16,
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      boxShadow: '0 10px 18px rgba(15,23,42,0.06)',
      color: '#475569',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    },
    inputBar: {
      padding: '12px 12px 14px',
      borderTop: '1px solid #E2E8F0',
      background: '#FFFFFF',
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    },
    inputWrap: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1px solid #CBD5E1',
      padding: '0 10px'
    },
    input: {
      width: '100%',
      border: 'none',
      background: 'transparent',
      padding: '12px 6px',
      fontSize: '1rem',
      outline: 'none',
      color: '#0F172A',
      fontWeight: 650
    },
    sendBtn: (enabled) => ({
      width: 48,
      height: 48,
      borderRadius: 16,
      background: enabled ? '#0D9488' : '#CBD5E1',
      border: '1px solid transparent',
      cursor: enabled ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: enabled ? '0 10px 22px rgba(13,148,136,0.22)' : 'none',
      transition: 'transform 120ms ease'
    })
  };

  return (
    <div style={ui.shell}>
      <div style={ui.phoneFrame}>
        {/* --- HEADER --- */}
        <header style={ui.header}>
          <div style={ui.headLeft}>
            <div style={ui.headIcon}><Bot size={20} color="#0D9488" /></div>
            <div>
              <h1 style={ui.headTitle}>AI Advisor</h1>
              <span style={ui.headSub}>Budgeting • Investing • Debt</span>
            </div>
          </div>

          <button
            onClick={clearChat}
            style={ui.clearBtn}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            title="Clear Chat"
          >
            <Trash2 size={18} />
          </button>
        </header>

        {/* --- CHAT AREA --- */}
        <div style={ui.chatWrap}>
          <div style={ui.chat}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} style={ui.row(isUser)}>
                  {!isUser && (
                    <div style={ui.avatar(false)}><Bot size={16} color="#0D9488" /></div>
                  )}

                  <div style={ui.bubble(isUser)}>{m.content}</div>

                  {isUser && (
                    <div style={ui.avatar(true)}><User size={16} color="#0D9488" /></div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={ui.row(false)}>
                <div style={ui.avatar(false)}><Bot size={16} color="#0D9488" /></div>
                <div style={ui.typing}>
                  Analyzing <Sparkles size={16} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* --- INPUT AREA --- */}
          <div style={ui.inputBar}>
            <div style={ui.inputWrap}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask a question..."
                style={ui.input}
                onFocus={(e) => {
                  e.currentTarget.parentElement.style.borderColor = '#0D9488';
                  e.currentTarget.parentElement.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.parentElement.style.borderColor = '#CBD5E1';
                  e.currentTarget.parentElement.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={ui.sendBtn(Boolean(input.trim()) && !loading)}
              onMouseDown={(e) => {
                if (input.trim() && !loading) e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Send size={20} color={input.trim() && !loading ? 'white' : '#64748B'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AITutor;