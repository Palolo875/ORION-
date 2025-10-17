import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

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
        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{content}</p>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
