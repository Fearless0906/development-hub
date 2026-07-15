import { useState, useEffect, useRef, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import {
  BookOpen,
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  PlayCircle,
  List,
  Award,
  HelpCircle,
  Loader2,
  Trash2,
  Edit2,
  Copy,
  GripVertical,
  Search,
  Plus,
  Eye,
  EyeOff,
  LockKeyhole,
  StickyNote,
  Target,
  FolderKanban,
  UserRound,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Certificate } from "@/components/learning/Certificate";
import {
  normalizeQuizData,
  Quiz,
  QuizAttemptAnswer,
  QuizData,
  QuizQuestion,
} from "@/components/learning/Quiz";
import {
  CodingChallenge,
  CodingChallengeData,
} from "@/components/learning/CodingChallenge";
import { CreateLessonDialog } from "@/components/learning/CreateLessonDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { Course, CourseModule, Lesson } from "@/types/learning";
import {
  LessonContent,
  RichTextEditor,
} from "@/components/markdown/RichTextEditor";

const iconMap: Record<string, React.ElementType> = {
  Code,
  Database,
  Globe,
  Layers,
  Lock,
  BookOpen,
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const REORDER_TEMP_OFFSET = 1000000;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isLikelyCommandLine = (line: string) =>
  /^(npm|node|npx|pnpm|yarn|git|python|pip|cd|mkdir|touch|cp|mv|rm|ls|code|django-admin|uvicorn|python3|bun)\b/i.test(
    line.trim(),
  ) ||
  /^(import|export|const|let|var|function|class)\b/.test(line.trim()) ||
  /[{}();=<>]/.test(line);

const isLikelySectionLabel = (line: string) =>
  /^[A-Z][A-Za-z0-9 /&()-]{1,40}:?$/.test(line.trim()) &&
  !/^https?:\/\//i.test(line.trim()) &&
  !isLikelyCommandLine(line);

const formatImportedLessonContent = (rawLines: string[]) => {
  const blocks: string[] = [];
  let codeBuffer: string[] = [];

  const flushCodeBuffer = () => {
    if (codeBuffer.length === 0) return;
    blocks.push(
      `<pre><code class="language-bash">${escapeHtml(codeBuffer.join("\n"))}</code></pre>`,
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
      if (isLikelyCommandLine(line)) {
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

type CourseReview = {
  id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

type CourseCertificateRecord = {
  certificate_id: string;
  issued_at: string;
};

type DragItem =
  | { type: "module"; moduleId: string }
  | { type: "lesson"; lessonId: string; sourceModuleId: string };

type QuizAttemptSummary = {
  score: number;
  total: number;
  passed: boolean;
  attempted_at: string;
};

interface CourseDetailProps {
  adminView?: boolean;
}

const CourseDetail = ({ adminView = false }: CourseDetailProps) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedLessonId = searchParams.get("lesson");
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const coursesPath = adminView ? "/admin/learning" : "/learning";

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(
    null,
  );
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [moduleToRename, setModuleToRename] = useState<CourseModule | null>(
    null,
  );
  const [renameModuleTitle, setRenameModuleTitle] = useState("");
  const [renamingModule, setRenamingModule] = useState(false);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const lessonItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lessonSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const courseContentScrollRef = useRef<HTMLDivElement | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<DragItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [lessonSearchQuery, setLessonSearchQuery] = useState("");
  const [openModuleIds, setOpenModuleIds] = useState<string[]>([]);
  const [quizAttemptsByLesson, setQuizAttemptsByLesson] = useState<
    Record<string, QuizAttemptSummary>
  >({});
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
  const [savingNoteLessonId, setSavingNoteLessonId] = useState<string | null>(
    null,
  );
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoveredReviewRating, setHoveredReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const reviewTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [certificateRecord, setCertificateRecord] =
    useState<CourseCertificateRecord | null>(null);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCourseData = async (targetLessonId?: string) => {
    if (!courseId) return;

    setLoading(true);

    const { data: courseData, error: courseError } = await api
      .from("courses")
      .select("*")
      .eq("slug", courseId)
      .single();

    if (courseError || !courseData) {
      console.error("Error fetching course:", courseError);
      setLoading(false);
      return;
    }

    const { data: reviewsData } = await api
      .from("course_reviews")
      .select("id, user_id, rating, review, created_at")
      .eq("course_id", courseData.id)
      .order("created_at", { ascending: false });

    setReviews((reviewsData || []) as CourseReview[]);

    if (user) {
      const userReview = (reviewsData || []).find(
        (review) => review.user_id === user.id,
      );

      if (userReview) {
        setReviewRating(Number(userReview.rating));
        setReviewText(userReview.review || "");
      }
    }

    setCourse(courseData as Course);
    let fetchedVisibleModules: CourseModule[] = [];

    const { data: modulesData, error: modulesError } = await api
      .from("course_modules")
      .select(
        `
        *,
        lessons (*)
      `,
      )
      .eq("course_id", courseData.id)
      .order("order_index");

    if (modulesError) {
      console.error("Error fetching modules:", modulesError);
    } else {
      const transformedModules: CourseModule[] = (modulesData || []).map(
        (m: any) => ({
          ...m,
          is_published: m.is_published ?? true,
          lessons: (m.lessons || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((l: any) => ({
              ...l,
              completion_rule: l.completion_rule || "manual",
              is_published: l.is_published ?? true,
              quiz: l.quiz as QuizQuestion[] | QuizData | null,
              challenge: l.challenge as CodingChallengeData | null,
            })),
        }),
      );
      const visibleModules = isAdmin
        ? transformedModules
        : transformedModules
            .filter((module) => module.is_published)
            .map((module) => ({
              ...module,
              lessons: module.lessons.filter((lesson) => lesson.is_published),
            }));

      fetchedVisibleModules = visibleModules;
      setModules(visibleModules);
      setOpenModuleIds((previousIds) =>
        previousIds.length > 0
          ? previousIds.filter((id) =>
              visibleModules.some((module) => module.id === id),
            )
          : visibleModules.map((module) => module.id),
      );

      const allLessons = visibleModules.flatMap((m) => m.lessons);
      if (
        targetLessonId &&
        allLessons.some((lesson) => lesson.id === targetLessonId)
      ) {
        setCurrentLessonId(targetLessonId);
        setPendingLessonId(targetLessonId);
      } else if (
        allLessons.length > 0 &&
        (!currentLessonId ||
          !allLessons.some((lesson) => lesson.id === currentLessonId))
      ) {
        setCurrentLessonId(allLessons[0].id);
      } else if (allLessons.length === 0) {
        setCurrentLessonId(null);
      }
    }

    if (user) {
      const { data: progressData } = await api
        .from("user_course_progress")
        .select("completed_lessons, last_lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id)
        .maybeSingle();

      if (progressData) {
        setCompletedLessons(progressData.completed_lessons || []);
        const visibleLessons = fetchedVisibleModules.flatMap(
          (module) => module.lessons,
        );
        const lastLessonExists = visibleLessons.some(
          (lesson) => lesson.id === progressData.last_lesson_id,
        );

        if (!targetLessonId && lastLessonExists) {
          setCurrentLessonId(progressData.last_lesson_id);
          setPendingLessonId(progressData.last_lesson_id);
        }
      }

      const { data: quizAttemptsData } = await api
        .from("user_quiz_attempts")
        .select("lesson_id, score, total, passed, attempted_at")
        .eq("user_id", user.id)
        .order("attempted_at", { ascending: false });

      const latestAttempts: Record<string, QuizAttemptSummary> = {};
      (quizAttemptsData || []).forEach((attempt) => {
        if (!latestAttempts[attempt.lesson_id]) {
          latestAttempts[attempt.lesson_id] = {
            score: attempt.score,
            total: attempt.total,
            passed: attempt.passed,
            attempted_at: attempt.attempted_at,
          };
        }
      });
      setQuizAttemptsByLesson(latestAttempts);

      const { data: notesData } = await api
        .from("user_lesson_notes")
        .select("lesson_id, note")
        .eq("user_id", user.id);

      const nextNotes: Record<string, string> = {};
      (notesData || []).forEach((note) => {
        nextNotes[note.lesson_id] = note.note;
      });
      setLessonNotes(nextNotes);

      const { data: certificateData } = await api
        .from("course_certificates")
        .select("certificate_id, issued_at")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id)
        .maybeSingle();

      setCertificateRecord(certificateData || null);
    } else {
      setCompletedLessons([]);
      setQuizAttemptsByLesson({});
      setLessonNotes({});
      setCertificateRecord(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCourseData(requestedLessonId || undefined);
  }, [courseId, isAdmin, requestedLessonId, user]);

  useEffect(() => {
    if (!adminView || authLoading || adminLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [adminLoading, adminView, authLoading, isAdmin, navigate, user]);

  useEffect(() => {
    if (!pendingLessonId || currentLessonId !== pendingLessonId) return;

    const frame = requestAnimationFrame(() => {
      lessonItemRefs.current[pendingLessonId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      lessonSectionRefs.current[pendingLessonId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingLessonId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [currentLessonId, pendingLessonId]);

  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons),
    [modules],
  );

  useEffect(() => {
    if (!currentLessonId || pendingLessonId) return;

    const activeModule = modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === currentLessonId),
    );
    if (!activeModule) return;

    setOpenModuleIds((ids) =>
      ids.includes(activeModule.id) ? ids : [...ids, activeModule.id],
    );

    let innerFrame: number | null = null;
    const frame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        const activeItem = lessonItemRefs.current[currentLessonId];
        const viewport = courseContentScrollRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]",
        ) as HTMLDivElement | null;
        if (!activeItem || !viewport) return;

        const itemRect = activeItem.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const itemIsVisible =
          itemRect.top >= viewportRect.top &&
          itemRect.bottom <= viewportRect.bottom;

        if (!itemIsVisible) {
          viewport.scrollTo({
            top:
              viewport.scrollTop +
              itemRect.top -
              viewportRect.top -
              viewport.clientHeight / 2 +
              itemRect.height / 2,
            behavior: "auto",
          });
        }
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      if (innerFrame !== null) cancelAnimationFrame(innerFrame);
    };
  }, [currentLessonId, modules, pendingLessonId]);

  const handleExportPdf = () => {
    if (!course) return;

    const moduleHtml = modules
      .map(
        (module, moduleIndex) => `
          <section class="module">
            <h2>Module ${moduleIndex + 1}: ${escapeHtml(module.title)}</h2>
            ${module.lessons
              .map(
                (lesson, lessonIndex) => `
                  <section class="lesson">
                    <h3>${moduleIndex + 1}.${lessonIndex + 1} ${escapeHtml(lesson.title)}</h3>
                    ${lesson.duration ? `<p class="duration">Duration: ${escapeHtml(lesson.duration)}</p>` : ""}
                    <div class="content">${lesson.content || '<p class="empty">No written lesson content.</p>'}</div>
                  </section>`,
              )
              .join("")}
          </section>`,
      )
      .join("");

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Allow pop-ups to open the course export preview");
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(`<!doctype html>
      <html><head><title>${escapeHtml(course.title)} - Course</title>
      <style>
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111827; background: #e5e7eb; font: 11pt/1.6 Arial, sans-serif; }
        .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; color: #fff; background: #0f172a; box-shadow: 0 2px 8px rgba(15, 23, 42, .2); }
        .toolbar p { margin: 0; }
        .toolbar strong { display: block; }
        .toolbar span { color: #cbd5e1; font-size: 9pt; }
        .toolbar button { padding: 9px 16px; border: 0; border-radius: 7px; color: #fff; background: #0d9488; font: inherit; font-weight: 700; cursor: pointer; }
        .toolbar button:hover { background: #0f766e; }
        .page { width: min(210mm, calc(100% - 32px)); min-height: 297mm; margin: 24px auto; padding: 18mm; background: #fff; box-shadow: 0 8px 30px rgba(15, 23, 42, .14); }
        header { padding-bottom: 18px; border-bottom: 2px solid #0f766e; }
        h1 { margin: 4px 0 8px; font-size: 26pt; line-height: 1.15; }
        .eyebrow { margin: 0; color: #0f766e; font-size: 9pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        .meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 12px; color: #4b5563; font-size: 9pt; }
        .module { margin-top: 28px; }
        .module > h2 { margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #99f6e4; color: #115e59; font-size: 18pt; }
        .lesson { margin-top: 24px; }
        .lesson > h3 { break-after: avoid; margin: 0 0 10px; color: #0f172a; font-size: 14pt; line-height: 1.3; }
        .duration, .empty { color: #6b7280; font-size: 9pt; }
        .content { color: #334155; }
        .content h1, .content h2, .content h3, .content h4, .content h5 { break-after: avoid; color: #0f172a; line-height: 1.3; }
        .content h1 { margin: 24px 0 12px; font-size: 20pt; }
        .content h2 { margin: 24px 0 12px; padding-bottom: 7px; border-bottom: 1px solid #cbd5e1; font-size: 17pt; }
        .content h3 { margin: 20px 0 9px; font-size: 14pt; }
        .content h4 { margin: 18px 0 9px; padding-left: 9px; border-left: 3px solid #06b6d4; font-size: 12pt; }
        .content h5 { margin: 16px 0 7px; font-size: 11pt; }
        p { margin: 9px 0; }
        ul, ol { margin: 10px 0; padding-left: 24px; }
        li { margin: 5px 0; padding-left: 2px; }
        pre { padding: 14px; border: 1px solid #cbd5e1; border-radius: 7px; color: #e2e8f0; background: #0f172a; white-space: pre-wrap; overflow-wrap: anywhere; }
        code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
        :not(pre) > code { padding: 1px 5px; border: 1px solid #cbd5e1; border-radius: 4px; color: #155e75; background: #f1f5f9; font-size: .9em; }
        blockquote { margin: 14px 0; padding: 9px 15px; border-left: 4px solid #f59e0b; border-radius: 0 7px 7px 0; background: #fffbeb; }
        blockquote p { margin: 3px 0; }
        table { width: 100%; margin: 14px 0; border-collapse: collapse; }
        th, td { padding: 7px 9px; border: 1px solid #cbd5e1; text-align: left; }
        th { color: #0f172a; background: #f1f5f9; }
        img { max-width: 100%; height: auto; }
        h1, h2, h3, h4, h5, pre, blockquote, table, img { break-inside: avoid; }
        @media print {
          * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          body { background: #fff; }
          .toolbar { display: none; }
          .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
        }
      </style></head><body>
        <div class="toolbar">
          <p><strong>Course export preview</strong><span>Review all lessons before saving the PDF.</span></p>
          <button type="button" onclick="window.print()">Print / Save as PDF</button>
        </div>
        <main class="page">
        <header>
          <p class="eyebrow">CDS Crash Course</p>
          <h1>${escapeHtml(course.title)}</h1>
          ${course.description ? `<p>${escapeHtml(course.description)}</p>` : ""}
          <div class="meta">
            <span>${course.level}</span><span>${modules.length} modules</span>
            <span>${allLessons.length} lessons</span>
            ${course.instructor_name ? `<span>By ${escapeHtml(course.instructor_name)}</span>` : ""}
          </div>
        </header>${moduleHtml}</main>
      </body></html>`);
    previewWindow.document.close();
    previewWindow.focus();
  };

  const handleImportPdf = async (file: File) => {
    if (!course || !isAdmin) return;
    setImportingPdf(true);

    try {
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const lines: { text: string; size: number }[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageLines = new Map<number, { parts: { x: number; text: string }[]; size: number }>();

        for (const rawItem of content.items) {
          if (!("str" in rawItem) || !rawItem.str.trim()) continue;
          const y = Math.round(rawItem.transform[5]);
          const existing = pageLines.get(y) || { parts: [], size: 0 };
          existing.parts.push({ x: rawItem.transform[4], text: rawItem.str });
          existing.size = Math.max(existing.size, rawItem.height || Math.abs(rawItem.transform[3]));
          pageLines.set(y, existing);
        }

        [...pageLines.entries()]
          .sort(([firstY], [secondY]) => secondY - firstY)
          .forEach(([, line]) => {
            const text = line.parts
              .sort((first, second) => first.x - second.x)
              .map((part) => part.text)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            if (
              text &&
              !/^\d+ of \d+$/.test(text) &&
              !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text) &&
              !text.startsWith(`${course.title} - Course`)
            ) {
              lines.push({ text, size: line.size });
            }
          });
      }

      type ImportedLesson = { title: string; lines: string[] };
      type ImportedModule = { title: string; lessons: ImportedLesson[] };
      const importedModules: ImportedModule[] = [];
      let currentModule: ImportedModule | null = null;
      let currentLesson: ImportedLesson | null = null;

      for (const line of lines) {
        const moduleMatch = line.text.match(/^Module\s+\d+\s*:\s*(.+)$/i);
        if (moduleMatch && line.size >= 16) {
          currentModule = { title: moduleMatch[1].trim(), lessons: [] };
          importedModules.push(currentModule);
          currentLesson = null;
          continue;
        }

        const lessonMatch = line.text.match(/^\d+\.\d+\s+(.+)$/);
        if (lessonMatch && currentModule && line.size >= 13 && line.size < 16) {
          currentLesson = { title: lessonMatch[1].trim(), lines: [] };
          currentModule.lessons.push(currentLesson);
          continue;
        }

        if (currentLesson) currentLesson.lines.push(line.text);
      }

      const validModules = importedModules.filter((module) => module.lessons.length > 0);
      if (validModules.length === 0) {
        toast.error("No modules and lessons were found in this PDF format");
        return;
      }

      for (let moduleIndex = 0; moduleIndex < validModules.length; moduleIndex += 1) {
        const importedModule = validModules[moduleIndex];
        const { data: createdModule, error: moduleError } = await api
          .from("course_modules")
          .insert({
            course_id: course.id,
            title: importedModule.title,
            order_index: modules.length + moduleIndex,
            is_published: true,
          })
          .select()
          .single();
        if (moduleError || !createdModule) throw moduleError || new Error("Module import failed");

        for (let lessonIndex = 0; lessonIndex < importedModule.lessons.length; lessonIndex += 1) {
          const importedLesson = importedModule.lessons[lessonIndex];
          const content = formatImportedLessonContent(importedLesson.lines);
          const { error: lessonError } = await api.from("lessons").insert({
            module_id: createdModule.id,
            title: importedLesson.title,
            content,
            order_index: lessonIndex,
            is_published: true,
          });
          if (lessonError) throw lessonError;
        }
      }

      toast.success(`Imported ${validModules.length} module${validModules.length === 1 ? "" : "s"} from PDF`);
      await fetchCourseData();
    } catch (error) {
      console.error("Error importing PDF:", error);
      toast.error("Failed to import PDF");
    } finally {
      setImportingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const currentLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === currentLessonId) || null,
    [allLessons, currentLessonId],
  );
  const filteredModules = useMemo(() => {
    const query = lessonSearchQuery.trim().toLowerCase();

    if (!query) return modules;

    return modules
      .map((module) => ({
        ...module,
        lessons: module.lessons.filter(
          (lesson) =>
            lesson.title.toLowerCase().includes(query) ||
            module.title.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (module) =>
          module.title.toLowerCase().includes(query) ||
          module.lessons.length > 0,
      );
  }, [lessonSearchQuery, modules]);
  const currentLessonIndex = useMemo(
    () =>
      currentLessonId
        ? allLessons.findIndex((lesson) => lesson.id === currentLessonId)
        : -1,
    [allLessons, currentLessonId],
  );
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      : Number(course?.rating || 0);
  const certificateId =
    certificateRecord?.certificate_id ||
    (course && user
      ? `CERT-${course.id.slice(0, 8).toUpperCase()}-${user.id
          .slice(0, 8)
          .toUpperCase()}`
      : "CERT-PENDING");
  const verificationUrl = `${window.location.origin}/learning/${courseId}?certificate=${certificateId}`;
  const isLessonLocked = (lessonId: string) => {
    if (!course?.is_progressive || isAdmin) return false;

    const index = allLessons.findIndex((lesson) => lesson.id === lessonId);
    if (index <= 0) return false;

    const previousLesson = allLessons[index - 1];
    return !completedLessons.includes(previousLesson.id);
  };

  useEffect(() => {
    const lessonSections = allLessons
      .map((lesson) => ({
        lessonId: lesson.id,
        section: lessonSectionRefs.current[lesson.id],
      }))
      .filter(
        (item): item is { lessonId: string; section: HTMLDivElement } =>
          Boolean(item.section),
      );

    if (lessonSections.length === 0 || pendingLessonId) return;

    let frame: number | null = null;
    const updateActiveLesson = () => {
      frame = null;
      const activationLine = 180;
      let activeLessonId = lessonSections[0].lessonId;

      for (const { lessonId, section } of lessonSections) {
        if (section.getBoundingClientRect().top <= activationLine) {
          activeLessonId = lessonId;
        } else {
          break;
        }
      }

      setCurrentLessonId((currentId) =>
        currentId === activeLessonId ? currentId : activeLessonId,
      );
    };
    const scheduleUpdate = (event?: Event) => {
      const scrollTarget = event?.target;
      if (
        scrollTarget instanceof Node &&
        courseContentScrollRef.current?.contains(scrollTarget)
      ) {
        return;
      }

      if (frame === null) frame = requestAnimationFrame(updateActiveLesson);
    };

    updateActiveLesson();
    document.addEventListener("scroll", scheduleUpdate, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [allLessons, pendingLessonId]);

  const completedCount = completedLessons.length;
  const isSearchingLessons = lessonSearchQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearchingLessons) return;

    setOpenModuleIds(filteredModules.map((module) => module.id));
  }, [filteredModules, isSearchingLessons]);

  const progressPercent =
    allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0;
  const canReorderContent = isAdmin && !isSearchingLessons;

  useEffect(() => {
    if (canReorderContent) return;

    setDraggingItem(null);
    setDragOverTarget(null);
  }, [canReorderContent]);

  useEffect(() => {
    if (!user || !course || !currentLessonId) return;

    const timeout = window.setTimeout(() => {
      api
        .from("user_course_progress")
        .upsert(
          {
            user_id: user.id,
            course_id: course.id,
            last_lesson_id: currentLessonId,
            completed_lessons: completedLessons,
            progress_percent: progressPercent,
          },
          {
            onConflict: "user_id,course_id",
          },
        )
        .then(({ error }) => {
          if (error) {
            console.error("Error saving last lesson:", error);
          }
        });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [completedLessons, course, currentLessonId, progressPercent, user]);

  useEffect(() => {
    if (!currentLesson || currentLesson.completion_rule !== "read") return;
    if (completedLessons.includes(currentLesson.id)) return;

    const timeout = window.setTimeout(() => {
      markLessonComplete(currentLesson.id, { silent: true });
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [completedLessons, currentLesson]);

  const markLessonComplete = async (
    lessonId: string,
    options: { silent?: boolean } = {},
  ) => {
    if (!user || !course) {
      if (!options.silent) {
        toast.error("Please sign in to track progress");
      }
      return;
    }

    if (completedLessons.includes(lessonId)) {
      return;
    }

    const newCompletedLessons = [...completedLessons, lessonId];

    const newProgress = Math.round(
      (newCompletedLessons.length / allLessons.length) * 100,
    );

    const { error } = await api.from("user_course_progress").upsert(
      {
        user_id: user.id,
        course_id: course.id,
        completed_lessons: newCompletedLessons,
        last_lesson_id: lessonId,
        progress_percent: newProgress,
        completed_at: newProgress === 100 ? new Date().toISOString() : null,
      },
      {
        onConflict: "user_id,course_id",
      },
    );

    if (error) {
      console.error("Error updating progress:", error);
      if (!options.silent) {
        toast.error("Failed to update progress");
      }
    } else {
      setCompletedLessons(newCompletedLessons);
      if (!options.silent) {
        toast.success("Lesson marked as complete!");
      }
    }
  };

  const scrollToLesson = (lessonId: string) => {
    if (isLessonLocked(lessonId)) {
      toast.error("Complete the previous lesson to unlock this one");
      return;
    }
    setCurrentLessonId(lessonId);
    lessonSectionRefs.current[lessonId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    lessonItemRefs.current[lessonId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const saveLessonNote = async (lessonId: string) => {
    if (!user) {
      toast.error("Please sign in to save notes");
      return;
    }

    setSavingNoteLessonId(lessonId);
    const { error } = await api.from("user_lesson_notes").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        note: lessonNotes[lessonId] || "",
      },
      {
        onConflict: "user_id,lesson_id",
      },
    );
    setSavingNoteLessonId(null);

    if (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
      return;
    }

    toast.success("Note saved");
  };

  const handleSaveReview = async () => {
    if (!user || !course) {
      toast.error("Please sign in to review this course");
      return;
    }

    setSavingReview(true);
    const { error } = await api.from("course_reviews").upsert(
      {
        user_id: user.id,
        course_id: course.id,
        rating: reviewRating,
        review: reviewTextRef.current?.value.trim() || "",
      },
      {
        onConflict: "user_id,course_id",
      },
    );
    setSavingReview(false);

    if (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save review");
      return;
    }

    const { data: reviewsData } = await api
      .from("course_reviews")
      .select("id, user_id, rating, review, created_at")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false });
    const nextReviews = (reviewsData || []) as CourseReview[];
    const nextAverage =
      nextReviews.length > 0
        ? Number(
            (
              nextReviews.reduce(
                (sum, review) => sum + Number(review.rating || 0),
                0,
              ) /
              nextReviews.length
            ).toFixed(1),
          )
        : course.rating || 0;

    setReviews(nextReviews);
    setCourse({ ...course, rating: nextAverage });
    await api
      .from("courses")
      .update({ rating: nextAverage })
      .eq("id", course.id);
    toast.success("Review saved");
  };

  const handleOpenCertificate = async () => {
    if (!user || !course) {
      toast.error("Please sign in to get your certificate");
      return;
    }

    if (certificateRecord) {
      setShowCertificate(true);
      return;
    }

    setIssuingCertificate(true);
    const issuedCertificateId = `CERT-${course.id
      .slice(0, 8)
      .toUpperCase()}-${user.id.slice(0, 8).toUpperCase()}-${Date.now()
      .toString(36)
      .toUpperCase()}`;
    const { data, error } = await api
      .from("course_certificates")
      .insert({
        certificate_id: issuedCertificateId,
        user_id: user.id,
        course_id: course.id,
      })
      .select("certificate_id, issued_at")
      .single();
    setIssuingCertificate(false);

    if (error) {
      console.error("Error issuing certificate:", error);
      toast.error("Failed to issue certificate");
      return;
    }

    setCertificateRecord(data);
    setShowCertificate(true);
  };

  const handleQuizComplete = async (
    lesson: Lesson,
    score: number,
    total: number,
    details?: {
      passed: boolean;
      percentage: number;
      answers: QuizAttemptAnswer[];
      passScore: number;
    },
  ) => {
    if (!user) {
      toast.error("Please sign in to participate in the quiz");
      return;
    }

    const quiz = normalizeQuizData(lesson.quiz);
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed =
      details?.passed ?? (total > 0 ? percentage >= quiz.passScore : false);

    const { error } = await api.from("user_quiz_attempts").insert({
      user_id: user.id,
      lesson_id: lesson.id,
      score,
      total,
      passed,
      pass_score: details?.passScore ?? quiz.passScore,
      selected_answers: details?.answers || [],
      question_results: details?.answers || [],
    });

    if (error) {
      console.error("Error saving quiz attempt:", error);
      toast.error("Quiz completed, but the attempt was not saved");
    } else {
      setQuizAttemptsByLesson((previousAttempts) => ({
        ...previousAttempts,
        [lesson.id]: {
          score,
          total,
          passed,
          attempted_at: new Date().toISOString(),
        },
      }));
    }

    toast.success(`Quiz completed! You scored ${score}/${total}`);

    if (lesson.completion_rule === "quiz" && passed) {
      markLessonComplete(lesson.id, { silent: true });
    }
  };

  const persistModuleOrder = async (updatedModules: CourseModule[]) => {
    const temporaryUpdates = updatedModules.map((module, index) =>
      api
        .from("course_modules")
        .update({ order_index: REORDER_TEMP_OFFSET + index })
        .eq("id", module.id),
    );

    const temporaryResults = await Promise.all(temporaryUpdates);
    const temporaryFailure = temporaryResults.find(({ error }) => error);

    if (temporaryFailure?.error) {
      throw temporaryFailure.error;
    }

    const finalUpdates = updatedModules.map((module, index) =>
      api
        .from("course_modules")
        .update({ order_index: index })
        .eq("id", module.id),
    );

    const finalResults = await Promise.all(finalUpdates);
    const finalFailure = finalResults.find(({ error }) => error);

    if (finalFailure?.error) {
      throw finalFailure.error;
    }
  };

  const persistLessonOrder = async (updatedModules: CourseModule[]) => {
    const temporaryUpdates = updatedModules.flatMap((module) =>
      module.lessons.map((lesson, index) =>
        api
          .from("lessons")
          .update({
            module_id: module.id,
            order_index: REORDER_TEMP_OFFSET + index,
          })
          .eq("id", lesson.id),
      ),
    );

    const temporaryResults = await Promise.all(temporaryUpdates);
    const temporaryFailure = temporaryResults.find(({ error }) => error);

    if (temporaryFailure?.error) {
      throw temporaryFailure.error;
    }

    const finalUpdates = updatedModules.flatMap((module) =>
      module.lessons.map((lesson, index) =>
        api
          .from("lessons")
          .update({
            module_id: module.id,
            order_index: index,
          })
          .eq("id", lesson.id),
      ),
    );

    const finalResults = await Promise.all(finalUpdates);
    const finalFailure = finalResults.find(({ error }) => error);

    if (finalFailure?.error) {
      throw finalFailure.error;
    }
  };

  const handleCreateModule = async () => {
    if (!course || !canReorderContent) return;

    const title = newModuleTitle.trim();
    if (!title) {
      toast.error("Module title is required");
      return;
    }

    setCreatingModule(true);
    const { error } = await api.from("course_modules").insert({
      course_id: course.id,
      title: title,
      order_index: modules.length,
      is_published: true,
    });
    setCreatingModule(false);

    if (error) {
      console.error("Error creating module:", error);
      toast.error("Failed to create module");
      return;
    }
    setCreateModuleOpen(false);
    setNewModuleTitle("");
    toast.success("Module created");
    fetchCourseData(currentLessonId || undefined);
  };

  const openRenameModuleDialog = (module: CourseModule) => {
    if (!isAdmin) return;

    setModuleToRename(module);
    setRenameModuleTitle(module.title);
  };

  const handleRenameModule = async () => {
    if (!isAdmin || !moduleToRename) return;

    const title = renameModuleTitle.trim();
    if (!title) {
      toast.error("Module title is required");
      return;
    }

    if (title === moduleToRename.title) {
      setModuleToRename(null);
      setRenameModuleTitle("");
      return;
    }
    setRenamingModule(true);
    const { error } = await api
      .from("course_modules")
      .update({ title })
      .eq("id", moduleToRename.id);
    setRenamingModule(false);

    if (error) {
      console.error("Error renaming module:", error);
      toast.error("Failed to rename module");
      return;
    }

    setModules((previousModules) =>
      previousModules.map((existingModule) =>
        existingModule.id === moduleToRename.id
          ? { ...existingModule, title }
          : existingModule,
      ),
    );
    setModuleToRename(null);
    setRenameModuleTitle("");
    toast.success("Module renamed");
  };

  const handleDuplicateLesson = async (lesson: Lesson) => {
    if (!canReorderContent) return;

    const module = modules.find((item) => item.id === lesson.module_id);
    if (!module) return;
    const nextOrderIndex =
      module.lessons.reduce(
        (maxOrder, currentLesson) =>
          Math.max(maxOrder, currentLesson.order_index),
        -1,
      ) + 1;

    const { data, error } = await api
      .from("lessons")
      .insert({
        module_id: lesson.module_id,
        title: `${lesson.title} Copy`,
        content: lesson.content,
        duration: lesson.duration,
        video_url: lesson.video_url,
        order_index: nextOrderIndex,
        quiz: lesson.quiz as unknown as undefined,
        challenge: lesson.challenge as unknown as undefined,
        completion_rule: lesson.completion_rule,
        is_published: lesson.is_published,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error duplicating lesson:", error);
      toast.error("Failed to duplicate lesson");
      return;
    }

    toast.success("Lesson duplicated");
    fetchCourseData(data.id);
  };

  const handleDeleteLesson = async () => {
    if (!canReorderContent || !lessonToDelete) return;

    setDeletingLessonId(lessonToDelete.id);
    const { error } = await api
      .from("lessons")
      .delete()
      .eq("id", lessonToDelete.id);
    setDeletingLessonId(null);

    if (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
      return;
    }
    setLessonToDelete(null);
    toast.success("Lesson deleted");
    fetchCourseData();
  };

  const handleCompletionRuleChange = async (
    lesson: Lesson,
    completionRule: Lesson["completion_rule"],
  ) => {
    if (!canReorderContent) return;

    const { error } = await api
      .from("lessons")
      .update({ completion_rule: completionRule })
      .eq("id", lesson.id);

    if (error) {
      console.error("Error updating completion rule:", error);
      toast.error("Failed to update completion rule");
      return;
    }

    setModules((previousModules) =>
      previousModules.map((module) => ({
        ...module,
        lessons: module.lessons.map((existingLesson) =>
          existingLesson.id === lesson.id
            ? { ...existingLesson, completion_rule: completionRule }
            : existingLesson,
        ),
      })),
    );
    toast.success("Completion rule updated");
  };

  const handleModuleDrop = async (targetModuleId: string) => {
    if (!canReorderContent || draggingItem?.type !== "module") return;

    const fromIndex = modules.findIndex(
      (module) => module.id === draggingItem.moduleId,
    );
    const toIndex = modules.findIndex((module) => module.id === targetModuleId);

    setDragOverTarget(null);
    setDraggingItem(null);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const reorderedModules = [...modules];
    const [movedModule] = reorderedModules.splice(fromIndex, 1);
    reorderedModules.splice(toIndex, 0, movedModule);

    const normalizedModules = reorderedModules.map((module, index) => ({
      ...module,
      order_index: index,
    }));

    setModules(normalizedModules);

    try {
      await persistModuleOrder(normalizedModules);
      toast.success("Module order updated");
    } catch (error) {
      console.error("Error updating module order:", error);
      toast.error("Failed to update module order");
      fetchCourseData(currentLessonId || undefined);
    }
  };

  const handleLessonDrop = async (
    targetModuleId: string,
    targetLessonId?: string,
  ) => {
    if (!canReorderContent || draggingItem?.type !== "lesson") return;
    const sourceModule = modules.find(
      (module) => module.id === draggingItem.sourceModuleId,
    );
    const lessonToMove = sourceModule?.lessons.find(
      (lesson) => lesson.id === draggingItem.lessonId,
    );

    setDragOverTarget(null);
    setDraggingItem(null);

    if (targetLessonId === draggingItem.lessonId) return;

    if (!sourceModule || !lessonToMove) return;

    const modulesWithoutLesson = modules.map((module) => ({
      ...module,
      lessons: module.lessons.filter(
        (lesson) => lesson.id !== draggingItem.lessonId,
      ),
    }));

    const updatedModules = modulesWithoutLesson.map((module) => {
      if (module.id !== targetModuleId) return module;

      const insertIndex = targetLessonId
        ? module.lessons.findIndex((lesson) => lesson.id === targetLessonId)
        : module.lessons.length;
      const nextLessons = [...module.lessons];

      nextLessons.splice(
        insertIndex >= 0 ? insertIndex : nextLessons.length,
        0,
        {
          ...lessonToMove,
          module_id: targetModuleId,
        },
      );

      return {
        ...module,
        lessons: nextLessons,
      };
    });

    const normalizedModules = updatedModules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson, index) => ({
        ...lesson,
        order_index: index,
      })),
    }));

    setModules(normalizedModules);

    try {
      await persistLessonOrder(normalizedModules);
      setCurrentLessonId(lessonToMove.id);
      toast.success("Lesson order updated");
    } catch (error) {
      console.error("Error updating lesson order:", error);
      toast.error("Failed to update lesson order");
      fetchCourseData(currentLessonId || undefined);
    }
  };

  const duplicateLesson = async (lesson: Lesson) => {
    const module = modules.find((item) => item.id === lesson.module_id);
    if (!module) return;
    const nextOrderIndex =
      module.lessons.reduce(
        (maxOrder, currentLesson) =>
          Math.max(maxOrder, currentLesson.order_index),
        -1,
      ) + 1;
    const { data, error } = await api
      .from("lessons")
      .insert({
        module_id: lesson.module_id,
        title: `${lesson.title} Copy`,
        content: lesson.content || "",
        duration: lesson.duration || "",
        video_url: lesson.video_url || "",
        order_index: nextOrderIndex,
        quiz: lesson.quiz || [],
        challenge: lesson.challenge,
        completion_rule: lesson.completion_rule,
        is_published: lesson.is_published,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Failed to duplicate lesson");
      return;
    }
    toast.success("Lesson duplicated");
    fetchCourseData(data?.id);
  };

  const handleModulePublishChange = async (
    module: CourseModule,
    isPublished: boolean,
  ) => {
    if (!isAdmin) return;

    const { error } = await api
      .from("course_modules")
      .update({ is_published: isPublished })
      .eq("id", module.id);

    if (error) {
      console.error("Error updating module publish status:", error);
      toast.error("Failed to update module publish status");
      return;
    }

    setModules((previousModules) =>
      previousModules.map((existingModule) =>
        existingModule.id === module.id
          ? { ...existingModule, is_published: isPublished }
          : existingModule,
      ),
    );
    toast.success(isPublished ? "Module published" : "Module moved to draft");
  };

  const handleLessonPublishChange = async (
    lesson: Lesson,
    isPublished: boolean,
  ) => {
    if (!isAdmin) return;

    const { error } = await api
      .from("lessons")
      .update({ is_published: isPublished })
      .eq("id", lesson.id);

    if (error) {
      console.error("Error updating lesson publish status:", error);
      toast.error("Failed to update lesson publish status");
      return;
    }

    setModules((previousModules) =>
      previousModules.map((module) => ({
        ...module,
        lessons: module.lessons.map((existingLesson) =>
          existingLesson.id === lesson.id
            ? { ...existingLesson, is_published: isPublished }
            : existingLesson,
        ),
      })),
    );
    toast.success(isPublished ? "Lesson published" : "Lesson moved to draft");
  };

  const handleRemoveModule = async (moduleToRemove: CourseModule) => {
    setDeletingModuleId(moduleToRemove.id);

    const { error: lessonsError } = await api
      .from("lessons")
      .delete()
      .eq("module_id", moduleToRemove.id);

    if (lessonsError) {
      console.error("Error deleting module lessons:", lessonsError);
      toast.error("Failed to remove module");
      setDeletingModuleId(null);
      return;
    }

    const { error: moduleError } = await api
      .from("course_modules")
      .delete()
      .eq("id", moduleToRemove.id);

    if (moduleError) {
      console.error("Error deleting module:", moduleError);
      toast.error("Failed to remove module");
      setDeletingModuleId(null);
      return;
    }

    setDeletingModuleId(null);
    setModuleToDelete(null);
    toast.success("Module removed");
    fetchCourseData();
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    setDeletingCourse(true);

    const { error: courseError } = await api
      .from("courses")
      .delete()
      .eq("id", course.id);

    setDeletingCourse(false);

    if (courseError) {
      console.error("Error deleting course:", courseError);
      toast.error("Failed to delete course");
      return;
    }

    toast.success("Course deleted successfully!");
    setDeleteCourseOpen(false);
    navigate(coursesPath);
  };

  if (loading || (adminView && (authLoading || adminLoading))) {
    return (
      <div className="min-h-screen bg-background">
        {!adminView && <Navbar />}
        <main
          className={cn(
            "pb-16 flex items-center justify-center",
            adminView ? "pt-16" : "pt-24",
          )}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        {!adminView && <Navbar />}
        <main className="pt-24 pb-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-4">
              Course Not Found
            </h1>
            <p className="text-muted-foreground mb-8">
              The course you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to={coursesPath}>Back to Courses</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const Icon = iconMap[course.icon || "Code"] || Code;
  const levelColors = {
    Beginner: "bg-green-500/10 text-green-500",
    Intermediate: "bg-amber-500/10 text-amber-500",
    Advanced: "bg-red-500/10 text-red-500",
  };

  return (
    <div className={adminView ? "bg-background" : "min-h-screen bg-background"}>
      {!adminView && <Navbar />}
      <main className={adminView ? "pt-0" : "pt-20"}>
        <div className="border-b border-border/50 bg-card/50">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link
                to={coursesPath}
                className="hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Courses
              </Link>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={`${course.title} thumbnail`}
                    className="hidden h-16 w-24 shrink-0 rounded-xl border border-border/60 bg-white p-1 object-contain dark:bg-slate-950 sm:block"
                  />
                ) : (
                  <div className="p-3 rounded-xl bg-primary/10 hidden sm:block">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="font-display text-2xl font-bold break-words">
                      {course.title}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={levelColors[course.level]}
                    >
                      {course.level}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <List className="h-4 w-4" />
                      {modules.length} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {allLessons.length} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students_count.toLocaleString()} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      {course.rating || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 xl:max-w-[48%]">
                {isAdmin && (
                  <>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleImportPdf(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={importingPdf}
                      onClick={() => pdfInputRef.current?.click()}
                      aria-label="Import PDF"
                      title="Import PDF"
                      className="h-9 w-9"
                    >
                      {importingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleExportPdf}
                      aria-label="Export PDF"
                      title="Export PDF"
                      className="h-9 w-9"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog
                      open={deleteCourseOpen}
                      onOpenChange={setDeleteCourseOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label="Delete course"
                          title="Delete course"
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete course?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete course "{course.title}" and all its modules,
                            lessons, and progress records? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingCourse}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteCourse}
                            disabled={deletingCourse}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingCourse && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <CreateLessonDialog
                      modules={modules}
                      courseId={course.id}
                      onLessonCreated={fetchCourseData}
                      iconOnly
                    />
                  </>
                )}
                <div className="hidden min-w-0 items-center gap-3 sm:flex">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      Your Progress
                    </div>
                    <div className="text-lg font-bold text-primary whitespace-nowrap">
                      {progressPercent}% Complete
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                </div>
                {progressPercent === 100 && (
                  <Button
                    onClick={handleOpenCertificate}
                    disabled={issuingCertificate}
                    className="hidden sm:flex"
                  >
                    {issuingCertificate ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4 mr-2" />
                    )}
                    Get Certificate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Certificate
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          courseName={course.title}
          certificateId={certificateId}
          verificationUrl={verificationUrl}
          studentName={
            user?.user_metadata?.username ||
            user?.email?.split("@")[0] ||
            "Student"
          }
          completionDate={new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          instructorName={course.instructor_name || "Instructor"}
        />

        <Dialog
          open={createModuleOpen}
          onOpenChange={(open) => {
            setCreateModuleOpen(open);
            if (!open) {
              setNewModuleTitle("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Module</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateModule();
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="new-module-title"
                  className="text-sm font-medium text-foreground"
                >
                  Module title
                </label>
                <Input
                  id="new-module-title"
                  value={newModuleTitle}
                  onChange={(event) => setNewModuleTitle(event.target.value)}
                  autoFocus
                  placeholder="New module title"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={creatingModule}
                  onClick={() => setCreateModuleOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingModule}>
                  {creatingModule && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Module
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(moduleToRename)}
          onOpenChange={(open) => {
            if (open) return;

            setModuleToRename(null);
            setRenameModuleTitle("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Module</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleRenameModule();
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="module-title"
                  className="text-sm font-medium text-foreground"
                >
                  Module title
                </label>
                <Input
                  id="module-title"
                  value={renameModuleTitle}
                  onChange={(event) => setRenameModuleTitle(event.target.value)}
                  autoFocus
                  placeholder="Module title"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={renamingModule}
                  onClick={() => {
                    setModuleToRename(null);
                    setRenameModuleTitle("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={renamingModule}>
                  {renamingModule && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Module
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(editingLessonId)}
          onOpenChange={(open) => {
            if (open) return;
            if (savingLessonId) return;

            setEditingLessonId(null);
            setEditingContent("");
          }}
        >
          <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden p-0">
            <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
              <DialogTitle>Edit Lesson Content</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <RichTextEditor
                value={editingContent}
                onChange={setEditingContent}
                minHeight="70vh"
              />
            </div>
            <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
              <Button
                variant="outline"
                disabled={Boolean(savingLessonId)}
                onClick={() => {
                  setEditingLessonId(null);
                  setEditingContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!editingLessonId || Boolean(savingLessonId)}
                onClick={async () => {
                  if (!editingLessonId) return;

                  setSavingLessonId(editingLessonId);

                  const { error } = await api
                    .from("lessons")
                    .update({ content: editingContent })
                    .eq("id", editingLessonId);

                  setSavingLessonId(null);

                  if (error) {
                    toast.error("Failed to save lesson");
                    return;
                  }

                  toast.success("Lesson saved");
                  const savedLessonId = editingLessonId;
                  setEditingLessonId(null);
                  setEditingContent("");
                  fetchCourseData(savedLessonId);
                }}
              >
                {savingLessonId ? "Saving..." : "Save Lesson"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(lessonToDelete)}
          onOpenChange={(open) => {
            if (!open && !deletingLessonId) {
              setLessonToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                {lessonToDelete
                  ? `Delete "${lessonToDelete.title}"? This action cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(deletingLessonId)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!lessonToDelete || Boolean(deletingLessonId)}
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteLesson();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingLessonId && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(moduleToDelete)}
          onOpenChange={(open) => {
            if (!open && !deletingModuleId) {
              setModuleToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove module?</AlertDialogTitle>
              <AlertDialogDescription>
                {moduleToDelete
                  ? `Remove "${moduleToDelete.title}" and all of its lessons? This action cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(deletingModuleId)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!moduleToDelete || Boolean(deletingModuleId)}
                onClick={(event) => {
                  event.preventDefault();

                  if (!moduleToDelete) return;

                  handleRemoveModule(moduleToDelete);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingModuleId && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="container max-w-7xl mx-auto px-4 py-6">
          {allLessons.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
              <p className="text-muted-foreground mb-4">
                This course doesn't have any lessons yet.
              </p>
              {isAdmin && (
                <CreateLessonDialog
                  modules={modules}
                  courseId={course.id}
                  onLessonCreated={fetchCourseData}
                />
              )}
            </div>
          ) : (
            <div className="flex gap-6">
              <div
                className={cn(
                  "flex flex-1 flex-col gap-6",
                  showSidebar ? "lg:mr-80" : "",
                )}
              >
                <section className="glass-card order-1 overflow-hidden border border-border/60">
                  <div className="bg-primary/[0.04] p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div className="hidden rounded-2xl bg-primary/10 p-3 text-primary sm:block">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          Course overview
                        </p>
                        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                          {course.title}
                        </h2>
                        {course.description && (
                          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {(course.topics || []).length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {(course.topics || []).map((topic) => (
                          <Badge
                            key={topic}
                            variant="secondary"
                            className="border border-border/60 bg-background/80 px-2.5 py-1"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="glass-card order-3 border border-border/60 p-6 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Course rating
                      </p>
                      <h2 className="mt-2 font-display text-xl font-semibold">
                        Rate this course
                      </h2>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="font-semibold text-foreground">
                          {averageRating.toFixed(1)}
                        </span>
                        <span>
                          ({reviews.length} {reviews.length === 1 ? "rating" : "ratings"})
                        </span>
                      </div>
                    </div>

                    {user && (
                      <div
                        className="flex items-center gap-1"
                        onMouseLeave={() => setHoveredReviewRating(0)}
                        aria-label={`Selected rating: ${reviewRating} out of 5`}
                      >
                        {[1, 2, 3, 4, 5].map((rating) => {
                          const isActive =
                            rating <= (hoveredReviewRating || reviewRating);
                          return (
                            <button
                              key={rating}
                              type="button"
                              onMouseEnter={() => setHoveredReviewRating(rating)}
                              onFocus={() => setHoveredReviewRating(rating)}
                              onBlur={() => setHoveredReviewRating(0)}
                              onClick={() => setReviewRating(rating)}
                              aria-label={`Rate ${rating} out of 5`}
                              className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Star
                                className={cn(
                                  "h-7 w-7 transition-colors",
                                  isActive
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/40",
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {user ? (
                    <div className="mt-5 space-y-3">
                      <Textarea
                        ref={reviewTextRef}
                        defaultValue={reviewText}
                        placeholder="Share what you liked or what could be improved (optional)"
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Your rating: {reviewRating}/5
                        </p>
                        <Button
                          type="button"
                          onClick={handleSaveReview}
                          disabled={savingReview}
                        >
                          {savingReview && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {reviews.some((review) => review.user_id === user.id)
                            ? "Update Rating"
                            : "Submit Rating"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Sign in to rate this course and share your feedback.
                      </p>
                      <Button asChild size="sm">
                        <Link to="/auth">Sign In to Rate</Link>
                      </Button>
                    </div>
                  )}
                </section>

                {modules.map((module, moduleIndex) => (
                  <section key={module.id} className="order-2 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Module {moduleIndex + 1}: {module.title}
                      </h2>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>

                    {module.lessons.map((lesson, lessonIndex) => {
                      const isCompleted = completedLessons.includes(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          ref={(node) => {
                            lessonSectionRefs.current[lesson.id] = node;
                          }}
                          className={cn(
                            "scroll-mt-28 rounded-2xl border border-slate-200 bg-card p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#131a24] dark:shadow-[0_22px_80px_rgba(2,8,20,0.4)]",
                            currentLessonId === lesson.id &&
                              "ring-1 ring-cyan-400/40",
                          )}
                        >
                          <div className="flex items-center justify-between mb-4 gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="rounded-md bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                {moduleIndex + 1}.{lessonIndex + 1}
                              </span>
                              <h3 className="min-w-0 font-display text-xl font-semibold text-foreground dark:text-slate-50">
                                {lesson.title}
                              </h3>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {isAdmin && (
                                <>
                                  <Select
                                    value={
                                      lesson.is_published
                                        ? "published"
                                        : "draft"
                                    }
                                    onValueChange={(value) =>
                                      handleLessonPublishChange(
                                        lesson,
                                        value === "published",
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label={
                                        lesson.is_published
                                          ? "Lesson is published"
                                          : "Lesson is draft"
                                      }
                                      title={
                                        lesson.is_published
                                          ? "Published"
                                          : "Draft"
                                      }
                                      className="h-9 w-12 px-2"
                                    >
                                      {lesson.is_published ? (
                                        <Eye className="h-4 w-4" />
                                      ) : (
                                        <EyeOff className="h-4 w-4" />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="published">
                                        Published
                                      </SelectItem>
                                      <SelectItem value="draft">
                                        Draft
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={lesson.completion_rule}
                                    onValueChange={(value) =>
                                      handleCompletionRuleChange(
                                        lesson,
                                        value as Lesson["completion_rule"],
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label={`Completion rule: ${lesson.completion_rule}`}
                                      title={`Completion rule: ${lesson.completion_rule}`}
                                      className="h-9 w-12 px-2"
                                    >
                                      {lesson.completion_rule === "read" ? (
                                        <BookOpen className="h-4 w-4" />
                                      ) : lesson.completion_rule === "quiz" ? (
                                        <HelpCircle className="h-4 w-4" />
                                      ) : lesson.completion_rule ===
                                        "challenge" ? (
                                        <Code className="h-4 w-4" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="manual">
                                        Manual
                                      </SelectItem>
                                      <SelectItem value="read">
                                        After reading
                                      </SelectItem>
                                      <SelectItem value="quiz">
                                        Quiz pass
                                      </SelectItem>
                                      <SelectItem value="challenge">
                                        Challenge pass
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    title="Duplicate lesson"
                                    aria-label="Duplicate lesson"
                                    onClick={() =>
                                      handleDuplicateLesson(lesson)
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    title="Delete lesson"
                                    aria-label="Delete lesson"
                                    onClick={() => setLessonToDelete(lesson)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    title="Remove module"
                                    aria-label="Remove module"
                                    onClick={() => setModuleToDelete(module)}
                                  >
                                    <Layers className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => duplicateLesson(lesson)}
                                  title="Duplicate lesson"
                                  aria-label="Duplicate lesson"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Edit lesson"
                                  aria-label="Edit lesson"
                                  onClick={() => {
                                    setEditingLessonId(lesson.id);
                                    setEditingContent(lesson.content || "");
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant={isCompleted ? "secondary" : "outline"}
                                size="icon"
                                title={
                                  isCompleted
                                    ? "Lesson completed"
                                    : "Mark lesson complete"
                                }
                                aria-label={
                                  isCompleted
                                    ? "Lesson completed"
                                    : "Mark lesson complete"
                                }
                                onClick={() => markLessonComplete(lesson.id)}
                                disabled={isCompleted}
                                className={cn(
                                  "border-slate-300 bg-background text-foreground hover:bg-slate-100 hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white",
                                  isCompleted &&
                                    "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
                                )}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <LessonContent content={lesson.content} />

                          {(() => {
                            const quiz = normalizeQuizData(lesson.quiz);

                            if (quiz.questions.length === 0) return null;

                            return (
                              <section className="mt-8 border-t border-border/60 pt-7">
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-primary/10 p-2.5">
                                      <HelpCircle className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                        Quick practice
                                      </p>
                                      <h4 className="mt-1 font-display text-xl font-semibold">
                                        Check what you learned
                                      </h4>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        Answer {quiz.questions.length}{" "}
                                        {quiz.questions.length === 1
                                          ? "question"
                                          : "questions"}{" "}
                                        to finish this knowledge check.
                                      </p>
                                    </div>
                                  </div>
                                  {quizAttemptsByLesson[lesson.id] && (
                                    <Badge
                                      variant="secondary"
                                      className={
                                        quizAttemptsByLesson[lesson.id].passed
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                          : "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                                      }
                                    >
                                      Last score:{" "}
                                      {quizAttemptsByLesson[lesson.id].score}/
                                      {quizAttemptsByLesson[lesson.id].total}
                                    </Badge>
                                  )}
                                </div>
                                <div className="rounded-xl bg-muted/20 p-4 sm:p-5">
                                  {user ? (
                                    <Quiz
                                      questions={quiz}
                                      onComplete={(score, total, details) => {
                                        handleQuizComplete(
                                          lesson,
                                          score,
                                          total,
                                          details,
                                        );
                                      }}
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center rounded-xl border border-border/60 bg-background/80 px-6 py-10 text-center">
                                      <div className="mb-4 rounded-full bg-primary/10 p-3">
                                        <LockKeyhole className="h-6 w-6 text-primary" />
                                      </div>
                                      <h5 className="font-display text-lg font-semibold">
                                        Sign in to take this quiz
                                      </h5>
                                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                        Log in to answer the questions, save your score,
                                        and track your course progress.
                                      </p>
                                      <Button asChild className="mt-5">
                                        <Link to="/auth">Sign In to Participate</Link>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </section>
                            );
                          })()}

                          {lesson.challenge && (
                            <div className="mt-8 space-y-4">
                              <h4 className="font-display text-lg font-semibold flex items-center gap-2">
                                <Code className="h-5 w-5 text-primary" />
                                Coding Challenge
                              </h4>
                              <CodingChallenge
                                challenge={lesson.challenge}
                                lessonId={lesson.id}
                                onComplete={(passed) => {
                                  if (passed) {
                                    toast.success(
                                      "Challenge completed! Great job!",
                                    );
                                    if (
                                      lesson.completion_rule === "challenge"
                                    ) {
                                      markLessonComplete(lesson.id, {
                                        silent: true,
                                      });
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>

              {showSidebar && (
                <div className="fixed bottom-4 right-4 top-[140px] hidden w-80 max-w-[calc(100vw-2rem)] lg:block">
                  <div className="glass-card flex h-full min-w-0 flex-col overflow-hidden">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">Course Content</h3>
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCreateModuleOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {completedCount} / {allLessons.length} lessons completed
                      </p>
                      <div className="relative mt-3">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={lessonSearchQuery}
                          onChange={(event) =>
                            setLessonSearchQuery(event.target.value)
                          }
                          placeholder="Search lessons"
                          className="h-9 pl-8"
                        />
                      </div>
                    </div>
                    <ScrollArea
                      ref={courseContentScrollRef}
                      className="min-h-0 min-w-0 flex-1 pr-1"
                    >
                      <Accordion
                        type="multiple"
                        value={openModuleIds}
                        onValueChange={setOpenModuleIds}
                        className="w-[calc(20rem-0.25rem)] min-w-0 max-w-full overflow-hidden p-2"
                      >
                        {filteredModules.length === 0 && (
                          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No lessons match your search.
                          </div>
                        )}
                        {filteredModules.map((module) => (
                          <AccordionItem
                            key={module.id}
                            value={module.id}
                            className={cn(
                              "min-w-0 overflow-hidden border-none rounded-lg",
                              dragOverTarget === `module-${module.id}` &&
                                "bg-primary/5 ring-1 ring-primary/30",
                            )}
                            onDragOver={(event) => {
                              if (
                                !isAdmin ||
                                !canReorderContent ||
                                !draggingItem ||
                                (draggingItem.type === "module" &&
                                  draggingItem.moduleId === module.id)
                              ) {
                                return;
                              }

                              event.preventDefault();
                              setDragOverTarget(`module-${module.id}`);
                            }}
                            onDragLeave={() => {
                              if (dragOverTarget === `module-${module.id}`) {
                                setDragOverTarget(null);
                              }
                            }}
                            onDrop={(event) => {
                              if (!canReorderContent || !draggingItem) return;
                              event.preventDefault();

                              if (draggingItem?.type === "module") {
                                handleModuleDrop(module.id);
                                return;
                              }

                              handleLessonDrop(module.id);
                            }}
                          >
                            <AccordionTrigger className="min-w-0 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary/50 [&>svg]:shrink-0">
                              <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                {canReorderContent && (
                                  <span
                                    draggable
                                    aria-label={`Drag ${module.title}`}
                                    className="shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-secondary active:cursor-grabbing"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      event.dataTransfer.effectAllowed = "move";
                                      setDraggingItem({
                                        type: "module",
                                        moduleId: module.id,
                                      });
                                    }}
                                    onDragEnd={() => {
                                      setDraggingItem(null);
                                      setDragOverTarget(null);
                                    }}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                )}
                                <span
                                  className="block min-w-0 max-w-[10rem] flex-1 truncate"
                                  title={module.title}
                                >
                                  {module.title}
                                </span>
                                {isAdmin && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${
                                      module.is_published
                                        ? "Unpublish"
                                        : "Publish"
                                    } ${module.title}`}
                                    className={cn(
                                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                      module.is_published
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-200",
                                    )}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleModulePublishChange(
                                        module,
                                        !module.is_published,
                                      );
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key !== "Enter" &&
                                        event.key !== " "
                                      ) {
                                        return;
                                      }
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleModulePublishChange(
                                        module,
                                        !module.is_published,
                                      );
                                    }}
                                  >
                                    {module.is_published ? "Live" : "Draft"}
                                  </span>
                                )}
                                {isAdmin && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Rename ${module.title}`}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      openRenameModuleDialog(module);
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key !== "Enter" &&
                                        event.key !== " "
                                      ) {
                                        return;
                                      }

                                      event.preventDefault();
                                      event.stopPropagation();
                                      openRenameModuleDialog(module);
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              <div
                                className="space-y-1 pl-2"
                                onDragOver={(event) => {
                                  if (
                                    !isAdmin ||
                                    draggingItem?.type !== "lesson" ||
                                    draggingItem.sourceModuleId === module.id
                                  ) {
                                    return;
                                  }

                                  event.preventDefault();
                                  setDragOverTarget(`module-${module.id}`);
                                }}
                                onDrop={(event) => {
                                  if (
                                    !canReorderContent ||
                                    draggingItem?.type !== "lesson"
                                  ) {
                                    return;
                                  }
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleLessonDrop(module.id);
                                }}
                              >
                                {module.lessons.map((lesson) => {
                                  const isCompleted = completedLessons.includes(
                                    lesson.id,
                                  );
                                  return (
                                    <button
                                      key={lesson.id}
                                      draggable={canReorderContent}
                                      data-lesson-id={lesson.id}
                                      ref={(node) => {
                                        lessonItemRefs.current[lesson.id] =
                                          node;
                                      }}
                                      onClick={() => scrollToLesson(lesson.id)}
                                      onDragStart={(event) => {
                                        if (!canReorderContent) return;

                                        event.stopPropagation();
                                        event.dataTransfer.effectAllowed =
                                          "move";
                                        setDraggingItem({
                                          type: "lesson",
                                          lessonId: lesson.id,
                                          sourceModuleId: module.id,
                                        });
                                      }}
                                      onDragOver={(event) => {
                                        if (
                                          !canReorderContent ||
                                          draggingItem?.type !== "lesson" ||
                                          draggingItem.lessonId === lesson.id
                                        ) {
                                          return;
                                        }

                                        event.preventDefault();
                                        event.stopPropagation();
                                        setDragOverTarget(
                                          `lesson-${lesson.id}`,
                                        );
                                      }}
                                      onDragLeave={() => {
                                        if (
                                          dragOverTarget ===
                                          `lesson-${lesson.id}`
                                        ) {
                                          setDragOverTarget(null);
                                        }
                                      }}
                                      onDrop={(event) => {
                                        if (
                                          !canReorderContent ||
                                          draggingItem?.type !== "lesson"
                                        ) {
                                          return;
                                        }

                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleLessonDrop(module.id, lesson.id);
                                      }}
                                      onDragEnd={() => {
                                        setDraggingItem(null);
                                        setDragOverTarget(null);
                                      }}
                                      className={cn(
                                        "flex w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg p-3 text-left transition-colors",
                                        currentLessonId === lesson.id
                                          ? "bg-primary/10 text-primary"
                                          : "hover:bg-secondary/50",
                                        dragOverTarget ===
                                          `lesson-${lesson.id}` &&
                                          "ring-1 ring-primary/40",
                                      )}
                                    >
                                      {canReorderContent && (
                                        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                                      )}
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      ) : currentLessonId === lesson.id ? (
                                        <PlayCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      )}
                                      <div className="min-w-0 max-w-[13rem] flex-1">
                                        <p
                                          title={lesson.title}
                                          className={cn(
                                            "block max-w-full truncate text-sm",
                                            isCompleted &&
                                              "text-muted-foreground",
                                          )}
                                        >
                                          {lesson.title}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
