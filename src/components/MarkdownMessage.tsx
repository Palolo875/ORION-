import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

interface MarkdownMessageProps {
  content: string;
  isDark?: boolean;
}

export const MarkdownMessage = ({ content, isDark = false }: MarkdownMessageProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, language: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(language);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";
          const code = String(children).replace(/\n$/, "");

          if (!inline && match) {
            return (
              <div className="relative group my-4">
                <div className="absolute right-2 top-2 z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(code, language)}
                    className="h-8 w-8 rounded-lg bg-background/50 hover:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedCode === language ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {language}
                    </span>
                  </div>
                  <SyntaxHighlighter
                    style={isDark ? oneDark : oneLight}
                    language={language}
                    PreTag="div"
                    className="!m-0 !bg-transparent text-sm"
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      background: "transparent",
                    }}
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-muted text-foreground font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-4 ml-4 list-decimal space-y-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-2xl sm:text-3xl font-bold mb-4 mt-6">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl sm:text-2xl font-bold mb-3 mt-5">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg sm:text-xl font-semibold mb-3 mt-4">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-border border border-border rounded-lg">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left text-sm font-semibold bg-muted">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="px-4 py-2 text-sm border-t border-border">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
