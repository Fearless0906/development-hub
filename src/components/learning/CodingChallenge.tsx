import { useState, useEffect } from "react";
import { Play, CheckCircle, XCircle, RotateCcw, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CodingChallengeData {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  testCases: {
    input: string;
    expectedOutput: string;
    description: string;
  }[];
  hints: string[];
}

interface CodingChallengeProps {
  challenge: CodingChallengeData;
  lessonId?: string;
  onComplete: (passed: boolean) => void;
}

export const CodingChallenge = ({ challenge, lessonId, onComplete }: CodingChallengeProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState(challenge.starterCode);
  const [output, setOutput] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ passed: boolean; message: string }[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Check if challenge was already completed and load saved code
  useEffect(() => {
    const checkCompletion = async () => {
      if (!user || !lessonId) return;
      
      const { data } = await supabase
        .from("user_challenge_completions")
        .select("id, code_submitted")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .eq("challenge_id", challenge.id)
        .maybeSingle();
      
      if (data) {
        setAlreadyCompleted(true);
        setAllPassed(true);
        // Load the saved code if available
        if (data.code_submitted) {
          setCode(data.code_submitted);
        }
      }
    };
    
    checkCompletion();
  }, [user, lessonId, challenge.id]);

  const saveCompletion = async (submittedCode: string) => {
    if (!user || !lessonId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_challenge_completions")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          challenge_id: challenge.id,
          code_submitted: submittedCode,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,lesson_id,challenge_id",
        });

      if (error) throw error;
      
      const isUpdate = alreadyCompleted;
      setAlreadyCompleted(true);
      toast.success(isUpdate ? "Code updated!" : "Challenge completed and saved!");
    } catch (error) {
      console.error("Error saving challenge completion:", error);
      toast.error("Failed to save progress. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Execute user code inside a sandboxed iframe (sandbox="allow-scripts" only, no allow-same-origin).
  // The iframe runs in a null origin: it cannot read cookies, localStorage, or the parent DOM.
  const executeInSandbox = (userCode: string): Promise<{ logs: string[]; error: string | null }> => {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts");
      iframe.style.display = "none";

      // Fixed sandbox template. User code is passed via postMessage, NOT interpolated into HTML.
      const sandboxHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
        (function() {
          function serialize(v) {
            if (v === null) return 'null';
            if (v === undefined) return 'undefined';
            if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
            return String(v);
          }
          window.addEventListener('message', function(event) {
            var data = event.data || {};
            if (data.type !== 'run' || typeof data.code !== 'string') return;
            var logs = [];
            var _console = {
              log:   function() { logs.push({ level: 'log',   text: Array.prototype.map.call(arguments, serialize).join(' ') }); },
              info:  function() { logs.push({ level: 'log',   text: Array.prototype.map.call(arguments, serialize).join(' ') }); },
              debug: function() { logs.push({ level: 'log',   text: Array.prototype.map.call(arguments, serialize).join(' ') }); },
              warn:  function() { logs.push({ level: 'warn',  text: Array.prototype.map.call(arguments, serialize).join(' ') }); },
              error: function() { logs.push({ level: 'error', text: Array.prototype.map.call(arguments, serialize).join(' ') }); }
            };
            var err = null;
            var timedOut = false;
            var timer = setTimeout(function() {
              timedOut = true;
              window.parent.postMessage({ type: 'result', logs: logs, error: 'Execution timed out (3s)' }, '*');
            }, 3000);
            try {
              var fn = new Function('console', '"use strict";' + data.code);
              fn(_console);
            } catch (e) {
              err = (e && e.message) ? e.message : String(e);
            }
            if (!timedOut) {
              clearTimeout(timer);
              window.parent.postMessage({ type: 'result', logs: logs, error: err }, '*');
            }
          });
          window.parent.postMessage({ type: 'ready' }, '*');
        })();
      </script></body></html>`;

      let settled = false;
      const finish = (result: { logs: string[]; error: string | null }) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", handler);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve(result);
      };

      const handler = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;
        const data = event.data as { type?: string; logs?: Array<{ level: string; text: string }>; error?: string | null };
        if (!data || typeof data !== "object") return;
        if (data.type === "ready") {
          iframe.contentWindow?.postMessage({ type: "run", code: userCode }, "*");
        } else if (data.type === "result") {
          const rawLogs = Array.isArray(data.logs) ? data.logs : [];
          const logs = rawLogs.map((l) =>
            l.level === "error" ? `[Error] ${l.text}` : l.level === "warn" ? `[Warn] ${l.text}` : l.text
          );
          finish({ logs, error: data.error ?? null });
        }
      };

      window.addEventListener("message", handler);
      // Safety timeout in case the sandbox never boots.
      setTimeout(() => finish({ logs: [], error: "Sandbox failed to start" }), 5000);

      iframe.srcdoc = sandboxHtml;
      document.body.appendChild(iframe);
    });
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput(null);
    setTestResults([]);
    setAllPassed(null);

    try {
      const { logs: consoleOutputs, error: executionError } = await executeInSandbox(code);
      if (executionError) consoleOutputs.push(`Error: ${executionError}`);
      const consoleOutput = consoleOutputs.join("\n");

      const results = challenge.testCases.map((testCase) => {
        let passed = false;
        if (!executionError) {
          const normalizedExpected = testCase.expectedOutput.trim().toLowerCase();
          passed =
            consoleOutput.trim().toLowerCase().includes(normalizedExpected) ||
            consoleOutputs.some((line) => line.trim().toLowerCase().includes(normalizedExpected));
        }
        return { passed, message: testCase.description };
      });

      const allTestsPassed = results.length > 0 && results.every((r) => r.passed);
      setTestResults(results);
      setOutput(
        consoleOutput ||
          (executionError
            ? `Error: ${executionError}`
            : "No output - make sure to use console.log() to display results")
      );
      setAllPassed(allTestsPassed);

      if (allTestsPassed) {
        await saveCompletion(code);
        onComplete(true);
      }
    } catch (error) {
      setOutput(`Execution Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setAllPassed(false);
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(challenge.starterCode);
    setOutput(null);
    setTestResults([]);
    setAllPassed(null);
  };

  const showSolution = () => {
    setCode(challenge.solution);
  };

  const showNextHint = () => {
    if (currentHint < challenge.hints.length - 1) {
      setCurrentHint(currentHint + 1);
    }
    setShowHints(true);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h4 className="font-semibold text-lg">{challenge.title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
      </div>

      {/* Code Editor */}
      <div className="border-b border-border/50">
        <div className="bg-slate-900 p-1">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
            <span className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </span>
            <span className="ml-2">solution.js</span>
          </div>
          <div className="bg-slate-950">
            <CodeEditor
              value={code}
              onChange={setCode}
              language="javascript"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-border/50 flex flex-wrap items-center gap-2">
        <Button onClick={runCode} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? "Running..." : "Run Code"}
        </Button>
        <Button variant="outline" onClick={resetCode}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button variant="ghost" onClick={showNextHint}>
          <Lightbulb className="h-4 w-4 mr-2" />
          Hint ({currentHint + 1}/{challenge.hints.length})
        </Button>
        <Button variant="ghost" onClick={showSolution} className="ml-auto text-muted-foreground">
          Show Solution
        </Button>
      </div>

      {/* Hints */}
      {showHints && (
        <div className="p-4 border-b border-border/50 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500">Hint {currentHint + 1}</p>
              <p className="text-sm text-muted-foreground">{challenge.hints[currentHint]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Output & Test Results */}
      {(output || testResults.length > 0) && (
        <div className="p-4">
          {/* Console Output */}
          {output && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Console Output</p>
              <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                {output}
              </pre>
            </div>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Test Results</p>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg text-sm",
                      result.passed ? "bg-green-500/10" : "bg-red-500/10"
                    )}
                  >
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{result.message}</span>
                  </div>
                ))}
              </div>

              {/* Overall Result */}
              {allPassed !== null && (
                <div className={cn(
                  "mt-4 p-4 rounded-lg text-center",
                  allPassed ? "bg-green-500/20" : "bg-amber-500/20"
                )}>
                  {allPassed ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="font-semibold text-green-500">All tests passed! 🎉</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <p className="font-semibold text-amber-500">Some tests failed. Keep trying!</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
