const hasMatch = (code: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(code));

export const detectCodeLanguage = (rawCode: string): string => {
  const code = rawCode.trim();

  if (!code) return "text";

  if (
    hasMatch(code, [
      /^\s*(from\s+\w+(?:\.\w+)*\s+import\s+.+|import\s+\w+(?:\.\w+)*)/m,
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+\s*(?:\(|:)/m,
      /\bself\b/,
      /:\s*$/m,
      /\bprint\s*\(/,
    ])
  ) {
    return "python";
  }

  if (
    hasMatch(code, [
      /<\w+[\s\S]*>/,
      /\buseState\b|\buseEffect\b|\buseMemo\b|\buseRef\b/,
      /\binterface\s+\w+/,
      /:\s*(string|number|boolean|React\.)/,
      /\bexport\s+default\s+function\b/,
    ])
  ) {
    return "tsx";
  }

  if (
    hasMatch(code, [
      /<\w+[\s\S]*>/,
      /\buseState\b|\buseEffect\b|\buseMemo\b|\buseRef\b/,
      /\bclassName=/,
      /\bexport\s+default\s+function\b/,
      /\bconst\s+\w+\s*=\s*\(\)\s*=>\s*</,
    ])
  ) {
    return "jsx";
  }

  if (
    hasMatch(code, [
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /:\s*(string|number|boolean|unknown|any)(\[\])?\b/,
      /\bas\s+(const|unknown|any|Record<)/,
      /\bimplements\b/,
    ])
  ) {
    return "typescript";
  }

  if (
    hasMatch(code, [
      /\bconsole\.log\b/,
      /\bfunction\s+\w+\s*\(/,
      /\b(const|let|var)\s+\w+\s*=/,
      /=>\s*{/,
      /\bmodule\.exports\b|\brequire\s*\(/,
    ])
  ) {
    return "javascript";
  }

  if (/^\s*</.test(code) && /<\/?[a-z][\s\S]*>/i.test(code)) {
    return "html";
  }

  if (
    hasMatch(code, [
      /^[\s.#@][^{]+\{[\s\S]*\}/m,
      /:\s*[^;]+;/,
      /@media\b|@keyframes\b/,
    ])
  ) {
    return "css";
  }

  try {
    JSON.parse(code);
    return "json";
  } catch {
    // fall through
  }

  if (hasMatch(code, [/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/im])) {
    return "sql";
  }

  if (hasMatch(code, [/^\s*#!/, /\becho\b/, /\bfi\b/, /\bgrep\b/, /\bchmod\b/])) {
    return "bash";
  }

  if (hasMatch(code, [/\bpublic\s+class\b/, /\bSystem\.out\.println\b/, /\bprivate\s+\w+\s+\w+\s*;/])) {
    return "java";
  }

  if (hasMatch(code, [/\busing\s+System\b/, /\bnamespace\s+\w+/, /\bpublic\s+(class|record)\b/])) {
    return "csharp";
  }

  if (hasMatch(code, [/#include\s*</, /\bstd::\w+/, /\bcout\s*<</])) {
    return "cpp";
  }

  if (hasMatch(code, [/<\?php/, /\becho\s+\$/, /\$\w+\s*=/])) {
    return "php";
  }

  if (hasMatch(code, [/\bfunc\s+\w+\s*\(/, /\bfmt\.Println\b/, /^\s*package\s+\w+/m])) {
    return "go";
  }

  if (hasMatch(code, [/\bfn\s+\w+\s*\(/, /\blet\s+mut\s+/, /\bprintln!\s*\(/])) {
    return "rust";
  }

  return "text";
};
