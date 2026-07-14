import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

type TokenType =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "tag"
  | "property";

const LANGUAGE_STYLES: Record<
  string,
  { badge: string; panel: string; border: string; body: string; line: string }
> = {
  typescript: {
    badge: "text-sky-300",
    panel: "bg-slate-800/95",
    border: "border-sky-200 dark:border-sky-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  tsx: {
    badge: "text-cyan-300",
    panel: "bg-slate-800/95",
    border: "border-cyan-200 dark:border-cyan-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  javascript: {
    badge: "text-amber-300",
    panel: "bg-slate-800/95",
    border: "border-amber-200 dark:border-amber-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  jsx: {
    badge: "text-blue-300",
    panel: "bg-slate-800/95",
    border: "border-blue-200 dark:border-blue-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  python: {
    badge: "text-emerald-300",
    panel: "bg-slate-800/95",
    border: "border-emerald-200 dark:border-emerald-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  html: {
    badge: "text-orange-300",
    panel: "bg-slate-800/95",
    border: "border-orange-200 dark:border-orange-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  css: {
    badge: "text-pink-300",
    panel: "bg-slate-800/95",
    border: "border-pink-200 dark:border-pink-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  json: {
    badge: "text-violet-300",
    panel: "bg-slate-800/95",
    border: "border-violet-200 dark:border-violet-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  bash: {
    badge: "text-lime-300",
    panel: "bg-slate-800/95",
    border: "border-lime-200 dark:border-lime-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  sql: {
    badge: "text-fuchsia-300",
    panel: "bg-slate-800/95",
    border: "border-fuchsia-200 dark:border-fuchsia-500/20",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
  text: {
    badge: "text-slate-300",
    panel: "bg-slate-800/95",
    border: "border-slate-200 dark:border-white/10",
    body: "bg-[hsl(222_47%_6%)]",
    line: "text-slate-100",
  },
};

const TOKEN_STYLES: Record<TokenType, string> = {
  plain: "text-slate-100",
  keyword: "text-sky-300",
  string: "text-emerald-300",
  number: "text-amber-300",
  comment: "text-slate-500 italic",
  operator: "text-fuchsia-300",
  tag: "text-cyan-300",
  property: "text-violet-300",
};

const keywordPatterns: Partial<Record<string, RegExp>> = {
  typescript:
    /\b(import|from|export|default|const|let|var|return|if|else|for|while|function|interface|type|extends|implements|async|await|new|class|try|catch|throw)\b/g,
  tsx:
    /\b(import|from|export|default|const|let|var|return|if|else|function|interface|type|async|await|new|class)\b/g,
  javascript:
    /\b(import|from|export|default|const|let|var|return|if|else|for|while|function|async|await|new|class|try|catch|throw)\b/g,
  jsx:
    /\b(import|from|export|default|const|let|var|return|if|else|function|async|await|new|class)\b/g,
  python:
    /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|yield|pass|break|continue|in|is|not|and|or|None|True|False)\b/g,
  html: /(&lt;\/?[\w-]+|&lt;\/?|\/?&gt;)/g,
  css:
    /\b(display|position|color|background|padding|margin|border|width|height|font-size|grid|flex|align-items|justify-content)\b/g,
  json: /"[^"]+"(?=\s*:)/g,
  bash:
    /\b(if|then|else|fi|for|do|done|echo|export|cd|pwd|chmod|grep|cat|npm|node|python)\b/g,
  sql:
    /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|JOIN|LEFT|RIGHT|INNER|ORDER|GROUP|BY|LIMIT|AS|AND|OR|NOT|NULL)\b/g,
};

const tokenizeLine = (line: string, language: string) => {
  const tokens: Array<{ text: string; type: TokenType }> = [
    { text: line, type: "plain" },
  ];

  const applyPattern = (pattern: RegExp, type: TokenType) => {
    const nextTokens: Array<{ text: string; type: TokenType }> = [];

    tokens.forEach((token) => {
      if (token.type !== "plain" || !token.text) {
        nextTokens.push(token);
        return;
      }

      let lastIndex = 0;
      const matches = [...token.text.matchAll(new RegExp(pattern.source, pattern.flags))];

      if (matches.length === 0) {
        nextTokens.push(token);
        return;
      }

      matches.forEach((match) => {
        const start = match.index ?? 0;
        const matchText = match[0];

        if (start > lastIndex) {
          nextTokens.push({
            text: token.text.slice(lastIndex, start),
            type: "plain",
          });
        }

        nextTokens.push({ text: matchText, type });
        lastIndex = start + matchText.length;
      });

      if (lastIndex < token.text.length) {
        nextTokens.push({
          text: token.text.slice(lastIndex),
          type: "plain",
        });
      }
    });

    tokens.splice(0, tokens.length, ...nextTokens);
  };

  if (["typescript", "tsx", "javascript", "jsx", "css"].includes(language)) {
    applyPattern(/\/\/.*/g, "comment");
    applyPattern(/\/\*.*?\*\//g, "comment");
  }

  if (language === "python") {
    applyPattern(/#.*/g, "comment");
  }

  if (language === "bash") {
    applyPattern(/#.*/g, "comment");
  }

  if (language === "sql") {
    applyPattern(/--.*/g, "comment");
  }

  applyPattern(/"[^"]*"|'[^']*'|`[^`]*`/g, "string");
  applyPattern(/\b\d+(\.\d+)?\b/g, "number");
  applyPattern(/[=:+\-*/<>!|&]+/g, "operator");

  const keywordPattern = keywordPatterns[language];
  if (keywordPattern) {
    applyPattern(keywordPattern, language === "html" ? "tag" : language === "json" ? "property" : "keyword");
  }

  if (["html", "tsx", "jsx"].includes(language)) {
    applyPattern(/<\/?[\w-]+/g, "tag");
  }

  return tokens;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = true,
  maxHeight = "400px",
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const languageKey = language.toLowerCase();
  const languageStyle = LANGUAGE_STYLES[languageKey] || LANGUAGE_STYLES.text;

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error("Copy failed");
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(code);

      setCopied(true);
      toast.success("Code copied!");

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      toast.error("Failed to copy code.");
    }
  };

  return (
    <div className={`overflow-hidden rounded-xl border ${languageStyle.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-white/10 px-4 py-2 ${languageStyle.panel}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${languageStyle.badge}`}>
          {language}
        </span>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-8 gap-2 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <pre
        className={`overflow-auto p-4 text-sm ${languageStyle.body} ${languageStyle.line}`}
        style={{ margin: 0, maxHeight }}
      >
        <code className="block font-mono">
          {lines.map((line, index) => (
            <div
              key={`${index}-${line}`}
              className={
                showLineNumbers
                  ? "grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-2"
                  : "block w-full"
              }
            >
              {showLineNumbers && (
                <span className="select-none pr-1 text-right text-slate-500">
                  {index + 1}
                </span>
              )}
              <span className="whitespace-pre">
                {(line ? tokenizeLine(line, languageKey) : [{ text: " ", type: "plain" }]).map(
                  (token, tokenIndex) => (
                    <span
                      key={`${index}-${tokenIndex}-${token.text}`}
                      className={TOKEN_STYLES[token.type]}
                    >
                      {token.text}
                    </span>
                  ),
                )}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

export const supportedLanguages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "docker", label: "Dockerfile" },
];
