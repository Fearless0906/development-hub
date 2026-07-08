import { useState } from "react";
import { Check, Copy, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const codeExample = `// Ask a question with code context
import { DevHub } from '@devhub/sdk';

const hub = new DevHub({ apiKey: process.env.API_KEY });

// Get instant answers with context
const answer = await hub.ask({
  question: "How do I optimize this React component?",
  code: myComponent,
  framework: "react",
});

console.log(answer.solution);
// → Detailed explanation + optimized code`;

export const CodePreview = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="qa" className="py-24 md:py-32 relative overflow-hidden">
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <div className="tag-badge mb-6">Developer Experience</div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Code-first{" "}
              <span className="text-gradient-primary">collaboration</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Share code snippets with syntax highlighting, get inline feedback, 
              and run examples directly in the browser. Perfect for learning and teaching.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Syntax highlighting for 100+ languages",
                "Live code execution in sandboxed environments",
                "Version history and collaborative editing",
                "AI-powered code explanations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="hero" size="lg" asChild>
              <Link to="/playground">
                Try the Playground
                <Play className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Code Preview */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-50" />
            
            <div className="relative glass-card overflow-hidden">
              {/* Window Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/80" />
                  <div className="w-3 h-3 rounded-full bg-accent/80" />
                  <div className="w-3 h-3 rounded-full bg-primary/80" />
                </div>
                <div className="text-xs text-muted-foreground font-mono">example.ts</div>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {/* Code Content */}
              <pre className="p-4 md:p-6 overflow-x-auto text-sm leading-relaxed">
                <code className="font-mono text-muted-foreground">
                  {codeExample.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-right pr-4 text-muted-foreground/50 select-none">
                        {i + 1}
                      </span>
                      <span className={
                        line.startsWith('//') 
                          ? 'text-muted-foreground/70' 
                          : line.includes('import') || line.includes('const') || line.includes('await')
                            ? 'text-primary'
                            : 'text-foreground'
                      }>
                        {line || ' '}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
