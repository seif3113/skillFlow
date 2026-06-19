"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface NodeChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeTitle: string;
}

export function NodeChatPanel({
  isOpen,
  onClose,
  nodeTitle,
}: NodeChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message when nodeTitle changes
  useEffect(() => {
    if (nodeTitle) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello! Let's explore **${nodeTitle}** together. I can explain the concepts, provide code examples, or test your knowledge on this topic. What would you like to learn first?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [nodeTitle]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: String(Date.now()),
      sender: "user",
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: `This is a mock AI response discussing "${inputValue.trim()}". In the future, this will connect to the NestJS API to query our RAG backend and stream live explanation text.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col bg-background border-l border-border shadow-2xl transition-transform duration-300 translate-x-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
              AI Assistant
            </h2>
            <p
              className="text-[10px] text-muted-foreground font-bold truncate max-w-[200px]"
              title={nodeTitle}
            >
              {nodeTitle}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar-track]:bg-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 border ${
                msg.sender === "user"
                  ? "bg-muted border-border text-foreground"
                  : "bg-sky-500/10 border-sky-500/20 text-sky-400"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div
              className={`flex flex-col max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-sky-600 text-white rounded-tr-none self-end"
                  : "bg-card border border-border text-card-foreground rounded-tl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <span className="text-[9px] text-muted-white self-end mt-1 font-bold">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="border-t border-border p-4 bg-background/80 backdrop-blur-md"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask about ${nodeTitle}...`}
            className="w-full bg-muted border border-border rounded-xl pl-4 pr-12 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 p-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
