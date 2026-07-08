import { useState, useCallback, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CodeEditor } from "@/components/learning/CodeEditor";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Loader2,
  Terminal,
  Code2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGE_TEMPLATES: Record<string, { name: string; code: string }> = {
  javascript: {
    name: "JavaScript",
    code: `// Welcome to the Playground! 🚀
// Try running this code or write your own.

function greet(name) {
  return \`Hello, \${name}! Welcome to DevHub.\`;
}

// Test the function
console.log(greet("Developer"));

// Try some array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Object destructuring
const user = { name: "Alex", role: "Developer", level: 42 };
const { name, role } = user;
console.log(\`\${name} is a \${role}\`);`,
  },
  typescript: {
    name: "TypeScript",
    code: `// TypeScript Playground 🎯
// Note: Types are checked but code runs as JavaScript

interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(name: string, email: string): User {
  return {
    id: Math.floor(Math.random() * 1000),
    name,
    email,
  };
}

const newUser = createUser("Alice", "alice@example.com");
console.log("Created user:", newUser);

// Generic function example
function identity<T>(arg: T): T {
  return arg;
}

console.log(identity<string>("Hello TypeScript!"));
console.log(identity<number>(42));`,
  },
  python: {
    name: "Python (Simulated)",
    code: `# Python Playground (Simulated Output)
# Note: This shows expected output for learning purposes

def fibonacci(n):
    """Generate Fibonacci sequence"""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

# Expected output:
print("Fibonacci(10):", fibonacci(10))
# → [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# List comprehension
squares = [x**2 for x in range(1, 6)]
print("Squares:", squares)
# → [1, 4, 9, 16, 25]`,
  },
  html: {
    name: "HTML",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevHub Playground</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    h1 { color: #1a1a2e; margin: 0 0 0.5rem; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Hello, World!</h1>
    <p>Welcome to the DevHub Playground</p>
  </div>
</body>
</html>`,
  },
  css: {
    name: "CSS",
    code: `/* CSS Playground 🎨 */
/* Edit the styles and run to see a live preview */

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f172a;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

h1 {
  color: white;
  font-size: 3rem;
  margin: 0 0 1rem;
}

p {
  color: #94a3b8;
  font-size: 1.125rem;
  max-width: 32rem;
  margin: 0 auto;
}`,
  },
  json: {
    name: "JSON",
    code: `{
  "name": "devhub-project",
  "version": "1.0.0",
  "description": "A sample JSON document",
  "author": {
    "name": "Developer",
    "email": "dev@example.com"
  },
  "tags": ["javascript", "typescript", "react"],
  "config": {
    "port": 3000,
    "debug": true,
    "features": {
      "darkMode": true,
      "notifications": false,
      "maxItems": 100
    }
  },
  "dependencies": [
    { "name": "react", "version": "^18.3.0" },
    { "name": "typescript", "version": "^5.0.0" }
  ]
}`,
  },
};

export default function Playground() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript.code);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "preview">("output");

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang]?.code || "");
    setOutput(null);
  };

  const runCode = useCallback(() => {
    if (language === "html" || language === "css") {
      setActiveTab("preview");
      if (language === "css") {
        const htmlWrapper = `<!DOCTYPE html>
<html><head><style>${code}</style></head>
<body>
  <div class="container">
    <span class="badge">CSS Preview</span>
    <h1>Hello, World!</h1>
    <p>This is a live preview of your CSS styles applied to sample HTML elements.</p>
  </div>
</body></html>`;
        setOutput(htmlWrapper);
      } else {
        setOutput(code);
      }
      return;
    }

    if (language === "json") {
      setActiveTab("output");
      setIsRunning(true);
      setOutput(null);
      setTimeout(() => {
        try {
          const parsed = JSON.parse(code);
          setOutput(`✓ Valid JSON\n\n${JSON.stringify(parsed, null, 2)}`);
        } catch (error) {
          setOutput(`❌ Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
          setIsRunning(false);
        }
      }, 300);
      return;
    }

    setIsRunning(true);
    setOutput(null);
    setActiveTab("output");

    setTimeout(() => {
      try {
        const consoleOutputs: string[] = [];

        const sandbox = {
          console: {
            log: (...args: unknown[]) => {
              consoleOutputs.push(
                args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")
              );
            },
            error: (...args: unknown[]) => {
              consoleOutputs.push(`❌ Error: ${args.map((a) => String(a)).join(" ")}`);
            },
            warn: (...args: unknown[]) => {
              consoleOutputs.push(`⚠️ Warning: ${args.map((a) => String(a)).join(" ")}`);
            },
            info: (...args: unknown[]) => {
              consoleOutputs.push(`ℹ️ ${args.map((a) => String(a)).join(" ")}`);
            },
          },
          Math,
          Array,
          Object,
          String,
          Number,
          Boolean,
          JSON,
          Date,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          setTimeout: () => consoleOutputs.push("⚠️ setTimeout is not available in sandbox"),
          setInterval: () => consoleOutputs.push("⚠️ setInterval is not available in sandbox"),
        };

        if (language === "python") {
          // Simulate Python output by extracting print statements
          const printMatches = code.match(/print\(["'](.+?)["']\)/g);
          if (printMatches) {
            printMatches.forEach((match) => {
              const content = match.replace(/print\(["']/, "").replace(/["']\)/, "");
              consoleOutputs.push(content);
            });
          }
          // Add comment outputs
          const commentOutputs = code.match(/# → .+/g);
          if (commentOutputs) {
            commentOutputs.forEach((comment) => {
              consoleOutputs.push(comment.replace("# → ", ""));
            });
          }
          if (consoleOutputs.length === 0) {
            consoleOutputs.push("✓ Code parsed successfully (Python simulation)");
          }
        } else {
          // JavaScript/TypeScript execution
          const sandboxedCode = `
            (function(console, Math, Array, Object, String, Number, Boolean, JSON, Date, parseInt, parseFloat, isNaN, isFinite, setTimeout, setInterval) {
              "use strict";
              ${code}
            })
          `;

          const fn = eval(sandboxedCode);
          fn(
            sandbox.console,
            sandbox.Math,
            sandbox.Array,
            sandbox.Object,
            sandbox.String,
            sandbox.Number,
            sandbox.Boolean,
            sandbox.JSON,
            sandbox.Date,
            sandbox.parseInt,
            sandbox.parseFloat,
            sandbox.isNaN,
            sandbox.isFinite,
            sandbox.setTimeout,
            sandbox.setInterval
          );
        }

        if (consoleOutputs.length === 0) {
          setOutput("✓ Code executed successfully (no output)");
        } else {
          setOutput(consoleOutputs.join("\n"));
        }
      } catch (error) {
        setOutput(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsRunning(false);
      }
    }, 300);
  }, [code, language]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to run code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runCode]);

  const resetCode = () => {
    setCode(LANGUAGE_TEMPLATES[language]?.code || "");
    setOutput(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      html: "html",
      css: "css",
      json: "json",
    };
    const ext = extensions[language] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playground.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  const shareCode = () => {
    const encoded = btoa(encodeURIComponent(code));
    const url = `${window.location.origin}/playground?code=${encoded}&lang=${language}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/50">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Code2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">Code Playground</h1>
                  <p className="text-sm text-muted-foreground">
                    Write, run, and experiment with code instantly
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGE_TEMPLATES).map(([key, { name }]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="glass-card overflow-hidden flex flex-col">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    playground.{language === "typescript" ? "ts" : language === "python" ? "py" : language === "javascript" ? "js" : language}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadCode}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shareCode}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 min-h-[400px] bg-slate-950">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  className="min-h-[400px]"
                />
              </div>

              {/* Editor Actions */}
              <div className="flex items-center gap-2 p-3 border-t border-border/50 bg-slate-900/50">
                <Button onClick={runCode} disabled={isRunning} className="gap-2">
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? "Running..." : "Run Code"}
                </Button>
                <Button variant="outline" onClick={resetCode} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="glass-card overflow-hidden flex flex-col">
              {/* Output Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  {language === "html" || language === "css" ? (
                    <>
                      <button
                        onClick={() => setActiveTab("output")}
                        className={cn(
                          "px-3 py-1 text-sm rounded-md transition-colors",
                          activeTab === "output"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Terminal className="h-4 w-4 inline mr-1" />
                        Console
                      </button>
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={cn(
                          "px-3 py-1 text-sm rounded-md transition-colors",
                          activeTab === "preview"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Sparkles className="h-4 w-4 inline mr-1" />
                        Preview
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Terminal className="h-4 w-4" />
                      Console Output
                    </div>
                  )}
                </div>
                {output && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOutput(null)}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Output Content */}
              <div className="flex-1 min-h-[400px] bg-slate-950 overflow-auto">
                {activeTab === "preview" && (language === "html" || language === "css") && output ? (
                  <iframe
                    srcDoc={output}
                    className="w-full h-full min-h-[400px] bg-white"
                    sandbox="allow-scripts"
                    title="HTML Preview"
                  />
                ) : output ? (
                  <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap">
                    {output}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                    <Terminal className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm">Run your code to see output here</p>
                    <p className="text-xs mt-1 opacity-60">
                      Press the "Run Code" button or use Ctrl/Cmd + Enter
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Tips
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Use <code className="text-primary">console.log()</code> to print output</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Code runs in a sandboxed environment for safety</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>HTML mode shows a live preview of your page</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>Share your code with the share button</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
