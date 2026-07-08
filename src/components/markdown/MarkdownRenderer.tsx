import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import "highlight.js/styles/atom-one-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div
      className={cn(
        "prose prose-invert max-w-none",
        // Headings
        "prose-headings:text-foreground prose-headings:font-display",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        // Paragraphs
        "prose-p:text-foreground prose-p:leading-relaxed",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Lists
        "prose-ul:text-foreground prose-ol:text-foreground",
        "prose-li:text-foreground prose-li:marker:text-muted-foreground",
        // Code
        "prose-code:text-primary prose-code:bg-secondary/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-[#282c34] prose-pre:border prose-pre:border-border prose-pre:rounded-lg",
        // Blockquotes
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic",
        // Tables
        "prose-table:border prose-table:border-border",
        "prose-th:bg-secondary/50 prose-th:text-foreground prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2",
        "prose-td:text-foreground prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2",
        // Horizontal rules
        "prose-hr:border-border",
        // Strong and emphasis
        "prose-strong:text-foreground prose-em:text-foreground",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Override pre to add better styling
          pre: ({ children, node, ...props }) => (
            <pre
              className="overflow-x-auto text-sm"
              {...props}
            >
              {children}
            </pre>
          ),
          // Override code to handle inline vs block
          code: ({ children, node, ...props }) => {
            const match = /language-(\w+)/.exec((props as any).className || "");
            const isInline = !match;
            if (isInline) {
              return (
                <code
                  className="text-primary bg-secondary/50 px-1.5 py-0.5 rounded font-mono text-sm"
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={(props as any).className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
