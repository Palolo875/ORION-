import { Bot, User } from "lucide-react";
import { MarkdownMessage } from "./MarkdownMessage";
import { useEffect, useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming = false }: ChatMessageProps) => {
  const isUser = role === "user";
  const [displayedContent, setDisplayedContent] = useState("");
  const [isDark, setIsDark] = useState(false);

  // Check if dark mode is active
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Streaming effect
  useEffect(() => {
    if (isStreaming && !isUser) {
      let currentIndex = 0;
      setDisplayedContent("");

      const interval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 20);

      return () => clearInterval(interval);
    } else {
      setDisplayedContent(content);
    }
  }, [content, isStreaming, isUser]);

  return (
    <div className={`flex gap-2 sm:gap-4 mb-4 sm:mb-6 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      )}
      <div
        className={`glass rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-6 sm:py-4 max-w-[85%] sm:max-w-[80%] ${
          isUser ? "bg-primary text-primary-foreground" : ""
        }`}
      >
        {isUser ? (
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
            {displayedContent}
          </p>
        ) : (
          <MarkdownMessage content={displayedContent} isDark={isDark} />
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
