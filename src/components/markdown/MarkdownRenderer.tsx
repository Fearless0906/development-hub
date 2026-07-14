import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { detectCodeLanguage } from "@/lib/detectCodeLanguage";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  language?: string;
}

const CodeBlock = ({ children, language, ...props }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = String(children).replace(/\n$/, "");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1621] dark:shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
        <span className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300/80">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="overflow-x-auto bg-slate-50 px-4 py-4 text-sm text-slate-900 dark:bg-[#0f1621] dark:text-slate-100"
        {...props}
      >
        {children}
      </pre>
    </div>
  );
};

const preserveManualIndentation = (markdown: string): string => {
  const lines = markdown.split("\n");
  let inFence = false;
  let fenceMarker = "";

  const listOrQuoteMarker = /^(?:[-*+]\s|\d+\.\s|>)/;

  const result = lines.map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (fenceMatch[1][0] === fenceMarker) {
        inFence = false;
      }
      return line;
    }

    if (inFence) return line;

    const leadingMatch = line.match(/^([ \t]+)(.*)$/);
    if (!leadingMatch) return line;

    const [, whitespace, rest] = leadingMatch;
    if (rest.trim() === "") return line;
    if (listOrQuoteMarker.test(rest)) return line;

    const preserved = whitespace
      .split("")
      .map((ch) => (ch === "\t" ? "&nbsp;&nbsp;&nbsp;&nbsp;" : "&nbsp;"))
      .join("");

    return preserved + rest;
  });

  return result.join("\n");
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({
  content,
  className,
}: MarkdownRendererProps) => {
  const preservedContent = preserveManualIndentation(content);

  return (
    <div
      className={cn(
        "prose max-w-none dark:prose-invert",
        // Headings
        "prose-headings:text-slate-900 prose-headings:font-display dark:prose-headings:text-slate-50",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        // Paragraphs
        "prose-p:text-slate-700 prose-p:leading-relaxed dark:prose-p:text-slate-200",
        // Links
        "prose-a:text-cyan-700 prose-a:no-underline hover:prose-a:text-cyan-800 hover:prose-a:underline dark:prose-a:text-cyan-300 dark:hover:prose-a:text-cyan-200",
        // Lists
        "prose-ul:text-slate-700 prose-ol:text-slate-700 dark:prose-ul:text-slate-200 dark:prose-ol:text-slate-200",
        "prose-li:text-slate-700 prose-li:marker:text-slate-400 dark:prose-li:text-slate-200 dark:prose-li:marker:text-slate-500",
        // Code
        "prose-code:text-cyan-800 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none dark:prose-code:text-cyan-200 dark:prose-code:bg-white/5",
        "prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0",
        // Blockquotes
        "prose-blockquote:not-italic prose-blockquote:text-amber-950 prose-blockquote:border-l-2 prose-blockquote:border-amber-500 prose-blockquote:bg-amber-500/10 prose-blockquote:rounded-r-xl prose-blockquote:px-5 prose-blockquote:py-3 dark:prose-blockquote:text-amber-100",
        // Tables
        "prose-table:border prose-table:border-slate-200 dark:prose-table:border-white/10",
        "prose-th:bg-slate-100 prose-th:text-slate-900 prose-th:border prose-th:border-slate-200 prose-th:px-4 prose-th:py-2 dark:prose-th:bg-white/5 dark:prose-th:text-slate-100 dark:prose-th:border-white/10",
        "prose-td:text-slate-700 prose-td:border prose-td:border-slate-200 prose-td:px-4 prose-td:py-2 dark:prose-td:text-slate-200 dark:prose-td:border-white/10",
        // Horizontal rules
        "prose-hr:border-slate-200 dark:prose-hr:border-white/10",
        // Strong and emphasis
        "prose-strong:text-slate-950 prose-em:text-slate-800 dark:prose-strong:text-white dark:prose-em:text-slate-100",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override pre to add better styling
          pre: ({ children, ...props }) => {
            const child = Array.isArray(children) ? children[0] : children;
            const childProps =
              child && typeof child === "object" && "props" in child
                ? (child as any).props
                : null;
            const className = childProps?.className || "";
            const match = /language-(\w+)/.exec(className);
            const code = String(childProps?.children ?? children).replace(
              /\n$/,
              "",
            );
            const language = match?.[1] || detectCodeLanguage(code);

            return (
              <CodeBlock language={language} {...props}>
                {childProps?.children ?? children}
              </CodeBlock>
            );
          },
          // Override code to handle inline vs block
          code: ({ children, ...props }) => {
            const match = /language-(\w+)/.exec((props as any).className || "");
            const isInline = !match;
            if (isInline) {
              return (
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-sm text-cyan-200">
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
        {preservedContent}
      </ReactMarkdown>
    </div>
  );
};
