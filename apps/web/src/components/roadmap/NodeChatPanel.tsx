"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User } from "lucide-react";
import { useNodeChats, useSendNodeChatMessage } from "@/hooks/useRoadmap";
import { authClient } from "@/lib/auth-client";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface NodeChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: number;
  nodeTitle: string;
}

// Simple built-in Markdown renderer to support basic syntax without external dependency issues
interface MarkdownRendererProps {
  content: string;
  isUser: boolean;
}

function MarkdownRenderer({ content, isUser }: MarkdownRendererProps) {
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const elements: React.ReactNode[] = [];

  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let index = 0;

    while (currentText.length > 0) {
      const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
      const codeMatch = currentText.match(/`(.*?)`/);

      const boldIndex = boldMatch?.index !== undefined ? boldMatch.index : Infinity;
      const codeIndex = codeMatch?.index !== undefined ? codeMatch.index : Infinity;

      if (boldIndex === Infinity && codeIndex === Infinity) {
        parts.push(<span key={index++}>{currentText}</span>);
        break;
      }

      if (boldIndex < codeIndex) {
        if (boldIndex > 0) {
          parts.push(<span key={index++}>{currentText.substring(0, boldIndex)}</span>);
        }
        parts.push(
          <strong key={index++} className={`font-bold ${isUser ? "text-white" : "text-foreground"}`}>
            {boldMatch![1]}
          </strong>
        );
        currentText = currentText.substring(boldIndex + boldMatch![0].length);
      } else {
        if (codeIndex > 0) {
          parts.push(<span key={index++}>{currentText.substring(0, codeIndex)}</span>);
        }
        parts.push(
          <code
            key={index++}
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              isUser
                ? "bg-sky-700 text-sky-100"
                : "bg-muted text-sky-400 border border-border"
            }`}
          >
            {codeMatch![1]}
          </code>
        );
        currentText = currentText.substring(codeIndex + codeMatch![0].length);
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className={`p-3 rounded-lg my-2 overflow-x-auto font-mono text-[10px] border ${
              isUser
                ? "bg-sky-700 border-sky-600 text-sky-100"
                : "bg-muted border-border text-foreground"
            }`}
          >
            <code>{codeBlockContent.join("\n")}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className={`text-xs font-bold mt-2 mb-1 ${isUser ? "text-white" : "text-foreground"}`}>
          {parseInline(line.substring(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className={`text-sm font-bold mt-3 mb-1.5 ${isUser ? "text-white" : "text-foreground"}`}>
          {parseInline(line.substring(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className={`text-base font-black mt-3 mb-2.5 ${isUser ? "text-white" : "text-foreground"}`}>
          {parseInline(line.substring(2))}
        </h2>
      );
    }
    // Lists
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().substring(2);
      elements.push(
        <ul key={i} className="list-disc list-inside ml-2 my-0.5">
          <li>{parseInline(cleanLine)}</li>
        </ul>
      );
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <ol key={i} className="list-decimal list-inside ml-2 my-0.5">
            <li value={parseInt(match[1])}>{parseInline(match[2])}</li>
          </ol>
        );
      }
    }
    // Blank line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="mb-1 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  }

  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key="unclosed-code"
        className={`p-3 rounded-lg my-2 overflow-x-auto font-mono text-[10px] border ${
          isUser
            ? "bg-sky-700 border-sky-600 text-sky-100"
            : "bg-muted border-border text-foreground"
        }`}
      >
        <code>{codeBlockContent.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export function NodeChatPanel({
  isOpen,
  onClose,
  nodeId,
  nodeTitle,
}: NodeChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  const { data: chatHistory, isLoading: isLoadingHistory } = useNodeChats(nodeId, userId);
  const [sendChatMessage, { loading: isSendingMessage }] = useSendNodeChatMessage();

  // Load chat history when it changes
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const mapped = chatHistory.map((c: any) => ({
        id: String(c.id),
        sender: c.sender as "user" | "ai",
        text: typeof c.message === "string" ? c.message : c.message.text || JSON.stringify(c.message),
        timestamp: new Date(c.sentAt || Date.now()),
      }));
      setMessages(mapped);
    } else if (nodeTitle) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello! Let's explore **${nodeTitle}** together. I can explain the concepts, provide code examples, or test your knowledge on this topic. What would you like to learn first?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [chatHistory, nodeTitle]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSendingMessage]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !nodeId || !userId || isSendingMessage) return;

    const userText = inputValue.trim();
    setInputValue("");

    // Optimistically add user message to messages list
    const userMessage: Message = {
      id: "temp-user-" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await sendChatMessage({
        variables: {
          nodeId,
          userId,
          sender: "user",
          message: { text: userText },
        },
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now(),
          sender: "ai",
          text: "Sorry, I encountered an error trying to connect to the assistant server. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }
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
              <MarkdownRenderer content={msg.text} isUser={msg.sender === "user"} />
              <span className="text-[9px] text-muted-white self-end mt-1 font-bold">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {isSendingMessage && (
          <div className="flex items-start gap-3 flex-row">
            <div className="p-2 rounded-xl shrink-0 border bg-sky-500/10 border-sky-500/20 text-sky-400">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="flex flex-col max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed bg-card border border-border text-card-foreground rounded-tl-none">
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

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
