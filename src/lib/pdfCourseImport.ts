import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { detectCodeLanguage } from "@/lib/detectCodeLanguage";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type ImportedLesson = { title: string; lines: string[] };
export type ImportedModule = { title: string; lessons: ImportedLesson[] };

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isLikelyShellCommand = (line: string) =>
  /^(npm|npx|pnpm|yarn|bun|node|python3?|pip3?|git|cd|mkdir|touch|cp|mv|rm|ls|code|django-admin|uvicorn|curl|docker|composer|cargo)\b/i.test(
    line.trim(),
  );

const isLikelyCodeLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isLikelyShellCommand(trimmed)) return true;
  if (
    /^(import|export|const|let|var|function|class|return|if|else|for|while|async|await|try|catch|finally|def|public|private|package)\b/.test(
      trimmed,
    )
  )
    return true;
  if (/^(\/\/|\/\*|\*\/|#\w)/.test(trimmed)) return true;
  if (/^<\/?[a-zA-Z]/.test(trimmed)) return true;
  if (/=>|===|!==|&&|\|\||\$\{/.test(trimmed)) return true;
  if (/[{}();]/.test(trimmed)) return true;
  return false;
};

const isLikelySectionLabel = (line: string) =>
  /^[A-Z][A-Za-z0-9 /&()-]{1,40}:?$/.test(line.trim()) &&
  !/^https?:\/\//i.test(line.trim()) &&
  !isLikelyCodeLine(line);

export const formatImportedLessonContent = (rawLines: string[]) => {
  const blocks: string[] = [];
  let codeBuffer: string[] = [];

  const flushCodeBuffer = () => {
    if (codeBuffer.length === 0) return;
    const code = codeBuffer.join("\n");
    const language = codeBuffer.every(isLikelyShellCommand)
      ? "bash"
      : detectCodeLanguage(code);
    blocks.push(
      `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`,
    );
    codeBuffer = [];
  };

  rawLines
    .map((line) => line.trim())
    .filter(
      (line) =>
        Boolean(line) &&
        !/^about:blank\b/i.test(line) &&
        !/^\d+\s*\/\s*\d+$/.test(line),
    )
    .forEach((line) => {
      if (isLikelyCodeLine(line)) {
        codeBuffer.push(line);
        return;
      }

      flushCodeBuffer();

      if (/^\d+\.\d+\s+/.test(line)) {
        blocks.push(`<h3>${escapeHtml(line)}</h3>`);
        return;
      }

      if (/^https?:\/\//i.test(line)) {
        const safeUrl = escapeHtml(line);
        blocks.push(
          `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>`,
        );
        return;
      }

      if (isLikelySectionLabel(line)) {
        const normalized = line.endsWith(":") ? line.slice(0, -1) : line;
        blocks.push(`<h4>${escapeHtml(normalized)}</h4>`);
        return;
      }

      if (/^[A-Za-z][^:]{1,30}:\s+.+$/.test(line)) {
        const [label, ...rest] = line.split(":");
        blocks.push(
          `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(
            rest.join(":").trim(),
          )}</p>`,
        );
        return;
      }

      blocks.push(`<p>${escapeHtml(line)}</p>`);
    });

  flushCodeBuffer();

  return blocks.join("");
};

export const extractPdfTextLines = async (file: File): Promise<string[]> => {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = new Map<number, { x: number; text: string }[]>();

    for (const rawItem of content.items) {
      if (!("str" in rawItem) || !rawItem.str.trim()) continue;
      const y = Math.round(rawItem.transform[5]);
      const row = pageLines.get(y) || [];
      row.push({ x: rawItem.transform[4], text: rawItem.str });
      pageLines.set(y, row);
    }

    [...pageLines.entries()]
      .sort(([firstY], [secondY]) => secondY - firstY)
      .forEach(([, row]) => {
        const text = row
          .sort((first, second) => first.x - second.x)
          .map((part) => part.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (
          text &&
          !/^\d+ of \d+$/.test(text) &&
          !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)
        ) {
          lines.push(text);
        }
      });
  }

  return lines;
};

/**
 * Parses extracted PDF text lines into modules/lessons. Recognizes this app's own
 * export format ("Module N: Title" + "N.N Title"), and falls back to a flat
 * "Lesson N: Title" format (grouping every lesson under one synthetic module)
 * for PDFs that weren't exported from this app.
 */
export const parseModulesFromLines = (
  lines: string[],
  fallbackModuleTitle: string,
): ImportedModule[] => {
  const importedModules: ImportedModule[] = [];
  let currentModule: ImportedModule | null = null;
  let currentLesson: ImportedLesson | null = null;

  for (const line of lines) {
    const moduleMatch = line.match(/^Module\s+\d+\s*:\s*(.+)$/i);
    if (moduleMatch) {
      currentModule = { title: moduleMatch[1].trim(), lessons: [] };
      importedModules.push(currentModule);
      currentLesson = null;
      continue;
    }

    const lessonMatch = line.match(/^\d+\.\d+\s+(.+)$/);
    if (lessonMatch && currentModule) {
      currentLesson = { title: lessonMatch[1].trim(), lines: [] };
      currentModule.lessons.push(currentLesson);
      continue;
    }

    if (currentLesson) currentLesson.lines.push(line);
  }

  let resultModules = importedModules.filter((module) => module.lessons.length > 0);
  if (resultModules.length > 0) return resultModules;

  const lineCounts = new Map<string, number>();
  lines.forEach((line) => lineCounts.set(line, (lineCounts.get(line) || 0) + 1));
  const isBoilerplate = (line: string) =>
    /^Page\s+\d+\s+of\s+\d+$/i.test(line) ||
    (line.length <= 80 && (lineCounts.get(line) || 0) >= 3);

  const lessons: ImportedLesson[] = [];
  const introLines: string[] = [];
  let currentFlatLesson: ImportedLesson | null = null;

  for (const line of lines) {
    if (isBoilerplate(line)) continue;

    const lessonHeading = line.match(/^Lesson\s+\d+\s*:\s*(.+)$/i);
    if (lessonHeading) {
      currentFlatLesson = { title: lessonHeading[1].trim(), lines: [] };
      lessons.push(currentFlatLesson);
      continue;
    }

    if (currentFlatLesson) currentFlatLesson.lines.push(line);
    else introLines.push(line);
  }

  if (lessons.length === 0) return [];

  const intro = introLines.slice(1).filter(Boolean);
  if (intro.length > 0) lessons.unshift({ title: "Introduction", lines: intro });

  resultModules = [{ title: fallbackModuleTitle, lessons }];
  return resultModules;
};

/**
 * Best-effort detection of a course title and description straight from the
 * PDF's own content: the title is the document's first line (its big heading),
 * and the description is the first real prose paragraph that follows it,
 * skipping bylines (date/handle lines) and short section labels along the way.
 */
export const detectCourseMeta = (lines: string[]): { title: string; description: string } => {
  const title = (lines[0] || "").trim();
  const structuralHeadingRe = /^(Module|Lesson)\s+\d+\s*:/i;
  const isByline = (line: string) =>
    /·/.test(line) || /^[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}\b/.test(line);
  const isHeadingLabel = (line: string) =>
    /^[A-Z][A-Za-z0-9 /&()-]{1,60}:?$/.test(line) && line.split(" ").length <= 8;

  const descriptionLines: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (structuralHeadingRe.test(line)) break;

    if (descriptionLines.length === 0) {
      if (isByline(line) || isHeadingLabel(line) || line.length < 30) continue;
      descriptionLines.push(line);
      continue;
    }

    if (isHeadingLabel(line) || line.length < 15) break;
    descriptionLines.push(line);
    if (descriptionLines.join(" ").length > 260) break;
  }

  return { title, description: descriptionLines.join(" ").slice(0, 400) };
};
