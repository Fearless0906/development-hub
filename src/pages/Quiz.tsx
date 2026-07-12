import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/integrations/django/api";
import {
  normalizeQuizData,
  QuizData,
  QuizQuestion,
} from "@/components/learning/Quiz";
import { Course, CourseModule, Lesson } from "@/types/learning";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";

type FlatLesson = Lesson & {
  courseTitle: string;
  moduleTitle: string;
};

type QuizAttempt = {
  lesson_id: string;
  score: number;
  total: number;
  passed: boolean;
  attempted_at: string;
};

const blankQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  question: "",
  type: "single",
  options: ["", "", "", ""],
  correctAnswers: [0],
  explanation: "",
});

const Quiz = () => {
  const [lessons, setLessons] = useState<FlatLesson[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [quiz, setQuiz] = useState<QuizData>({
    questions: [blankQuestion()],
    passScore: 70,
    unlimitedAttempts: true,
    reviewAnswers: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState<QuizQuestion>(blankQuestion);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(
    null,
  );

  const selectedLesson = lessons.find(
    (lesson) => lesson.id === selectedLessonId,
  );
  const selectedAttempts = attempts.filter(
    (attempt) => attempt.lesson_id === selectedLessonId,
  );
  const passedAttempts = selectedAttempts.filter((attempt) => attempt.passed);
  const averageScore =
    selectedAttempts.length > 0
      ? Math.round(
          selectedAttempts.reduce(
            (sum, attempt) =>
              sum +
              (attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0),
            0,
          ) / selectedAttempts.length,
        )
      : 0;
  const passRate =
    selectedAttempts.length > 0
      ? Math.round((passedAttempts.length / selectedAttempts.length) * 100)
      : 0;

  const lessonsWithQuiz = useMemo(
    () =>
      lessons.filter(
        (lesson) => normalizeQuizData(lesson.quiz).questions.length > 0,
      ).length,
    [lessons],
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [
        { data: coursesData },
        { data: modulesData },
        { data: lessonsData },
        { data: attemptsData },
      ] = await Promise.all([
        api.from("courses").select("id, title"),
        api.from("course_modules").select("id, course_id, title"),
        api.from("lessons").select("*").order("order_index"),
        api.from("user_quiz_attempts").select("*"),
      ]);

      const courseTitles = ((coursesData || []) as Course[]).reduce<
        Record<string, string>
      >(
        (titles, course) => ({
          ...titles,
          [course.id]: course.title,
        }),
        {},
      );
      const modules = (modulesData || []) as CourseModule[];
      const moduleData = modules.reduce<
        Record<string, { courseId: string; title: string }>
      >(
        (map, module) => ({
          ...map,
          [module.id]: {
            courseId: module.course_id,
            title: module.title,
          },
        }),
        {},
      );
      const flatLessons = ((lessonsData || []) as Lesson[]).map((lesson) => ({
        ...lesson,
        moduleTitle: moduleData[lesson.module_id]?.title || "Module",
        courseTitle:
          courseTitles[moduleData[lesson.module_id]?.courseId] || "Course",
      }));

      setLessons(flatLessons);
      setAttempts((attemptsData || []) as QuizAttempt[]);

      const firstLesson = flatLessons[0];
      if (firstLesson) {
        setSelectedLessonId(firstLesson.id);
        setQuiz(normalizeQuizData(firstLesson.quiz));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLessonChange = (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    setSelectedLessonId(lessonId);
    setQuiz(
      lesson
        ? normalizeQuizData(lesson.quiz)
        : {
            questions: [blankQuestion()],
            passScore: 70,
            unlimitedAttempts: true,
            reviewAnswers: true,
          },
    );
  };

  const updateQuestion = (index: number, nextQuestion: QuizQuestion) => {
    setQuiz((currentQuiz) => ({
      ...currentQuiz,
      questions: currentQuiz.questions.map((question, questionIndex) =>
        questionIndex === index ? nextQuestion : question,
      ),
    }));
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const question = quiz.questions[questionIndex];
    updateQuestion(questionIndex, {
      ...question,
      options: question.options.map((option, index) =>
        index === optionIndex ? value : option,
      ),
    });
  };

  const toggleCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const question = quiz.questions[questionIndex];
    const currentAnswers = question.correctAnswers || [];
    const nextAnswers =
      question.type === "multiple"
        ? currentAnswers.includes(optionIndex)
          ? currentAnswers.filter((answer) => answer !== optionIndex)
          : [...currentAnswers, optionIndex]
        : [optionIndex];

    updateQuestion(questionIndex, {
      ...question,
      correctAnswer: nextAnswers[0],
      correctAnswers: nextAnswers,
    });
  };

  const openQuestionDialog = () => {
    setEditingQuestionIndex(null);
    setQuestionDraft(blankQuestion());
    setQuestionDialogOpen(true);
  };

  const openEditQuestionDialog = (
    question: QuizQuestion,
    questionIndex: number,
  ) => {
    setEditingQuestionIndex(questionIndex);
    setQuestionDraft({
      ...question,
      options: [...question.options],
      correctAnswers: [...(question.correctAnswers || [])],
    });
    setQuestionDialogOpen(true);
  };

  const toggleDraftCorrectAnswer = (optionIndex: number) => {
    setQuestionDraft((draft) => {
      const currentAnswers = draft.correctAnswers || [];
      const correctAnswers =
        draft.type === "multiple"
          ? currentAnswers.includes(optionIndex)
            ? currentAnswers.filter((answer) => answer !== optionIndex)
            : [...currentAnswers, optionIndex]
          : [optionIndex];

      return {
        ...draft,
        correctAnswer: correctAnswers[0],
        correctAnswers,
      };
    });
  };

  const addQuestion = () => {
    if (
      !questionDraft.question.trim() ||
      questionDraft.options.some((option) => !option.trim()) ||
      !questionDraft.correctAnswers?.length
    ) {
      toast.error("Add the question, all answer choices, and a correct answer");
      return;
    }

    if (editingQuestionIndex !== null) {
      updateQuestion(editingQuestionIndex, questionDraft);
      setEditingQuestionIndex(null);
      setQuestionDialogOpen(false);
      toast.success("Question updated");
      return;
    }

    setQuiz((currentQuiz) => ({
      ...currentQuiz,
      questions: [
        ...currentQuiz.questions.filter(
          (question) =>
            question.question.trim() ||
            question.options.some((option) => option.trim()),
        ),
        questionDraft,
      ],
    }));
    setQuestionDraft(blankQuestion());
    toast.success("Question added. You can create the next question.");
  };

  const handleSave = async () => {
    if (!selectedLesson) {
      toast.error("Select a lesson first");
      return;
    }

    const invalidQuestion = quiz.questions.find(
      (question) =>
        !question.question.trim() ||
        question.options.some((option) => !option.trim()) ||
        !question.correctAnswers?.length,
    );

    if (invalidQuestion) {
      toast.error("Every question needs text, options, and a correct answer");
      return;
    }

    setSaving(true);
    const { error } = await api
      .from("lessons")
      .update({
        quiz,
        completion_rule: "quiz",
      })
      .eq("id", selectedLesson.id);
    setSaving(false);

    if (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
      return;
    }

    setLessons((currentLessons) =>
      currentLessons.map((lesson) =>
        lesson.id === selectedLesson.id ? { ...lesson, quiz } : lesson,
      ),
    );
    toast.success("Quiz saved");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[70vh] items-center justify-center pt-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <header className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Course quiz
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold">
                      {selectedLesson?.title || "Choose a lesson"}
                    </h1>
                    {selectedLesson && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {selectedLesson.courseTitle} ·{" "}
                        {selectedLesson.moduleTitle}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving || !selectedLesson}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Quiz
                </Button>
              </div>
            </header>

            <div className="space-y-8 p-5 sm:p-7">
              <div className="grid gap-4 lg:grid-cols-[1.6fr_0.55fr]">
                <div className="space-y-2">
                  <Label>Lesson</Label>
                  <Select
                    value={selectedLessonId}
                    onValueChange={handleLessonChange}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.courseTitle} / {lesson.moduleTitle} /{" "}
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Passing score</Label>
                  <div className="relative">
                    <Input
                      className="h-11 pr-9"
                      type="number"
                      min={0}
                      max={100}
                      value={quiz.passScore}
                      onChange={(event) =>
                        setQuiz((currentQuiz) => ({
                          ...currentQuiz,
                          passScore: Number(event.target.value),
                        }))
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/15 p-4">
                  <div>
                    <p className="text-sm font-medium">Allow retries</p>
                    <p className="text-xs text-muted-foreground">
                      Learners can try the quiz again.
                    </p>
                  </div>
                  <Switch
                    checked={quiz.unlimitedAttempts}
                    onCheckedChange={(checked) =>
                      setQuiz((currentQuiz) => ({
                        ...currentQuiz,
                        unlimitedAttempts: checked,
                      }))
                    }
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/15 p-4">
                  <div>
                    <p className="text-sm font-medium">Show answer review</p>
                    <p className="text-xs text-muted-foreground">
                      Display feedback after submission.
                    </p>
                  </div>
                  <Switch
                    checked={quiz.reviewAnswers}
                    onCheckedChange={(checked) =>
                      setQuiz((currentQuiz) => ({
                        ...currentQuiz,
                        reviewAnswers: checked,
                      }))
                    }
                  />
                </label>
              </div>

              <section className="space-y-5">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Questions
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Build a short knowledge check for this lesson.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openQuestionDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain pr-1 sm:pr-2">
                  {quiz.questions.map((question, questionIndex) => (
                    <article
                    key={question.id}
                    className="rounded-2xl border border-border/60 bg-background/60 p-5 sm:p-6"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {questionIndex + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold">
                            Question {questionIndex + 1}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {question.type === "multiple"
                              ? "Select all that apply"
                              : "Choose one answer"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() =>
                            openEditQuestionDialog(question, questionIndex)
                          }
                          aria-label={`Edit question ${questionIndex + 1}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={quiz.questions.length === 1}
                          onClick={() =>
                            setQuiz((currentQuiz) => ({
                              ...currentQuiz,
                              questions: currentQuiz.questions.filter(
                                (_, index) => index !== questionIndex,
                              ),
                            }))
                          }
                          aria-label={`Delete question ${questionIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_210px]">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Textarea
                          value={question.question}
                          onChange={(event) =>
                            updateQuestion(questionIndex, {
                              ...question,
                              question: event.target.value,
                            })
                          }
                          rows={3}
                          placeholder="Write the question learners will answer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer format</Label>
                        <Select
                          value={question.type || "single"}
                          onValueChange={(value: "single" | "multiple") =>
                            updateQuestion(questionIndex, {
                              ...question,
                              type: value,
                              correctAnswers:
                                value === "single"
                                  ? [question.correctAnswers?.[0] ?? 0]
                                  : question.correctAnswers?.length
                                    ? question.correctAnswers
                                    : [0],
                            })
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">One answer</SelectItem>
                            <SelectItem value="multiple">
                              Multiple answers
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Answer choices</Label>
                        <span className="text-xs text-muted-foreground">
                          Mark the correct answer
                        </span>
                      </div>
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={(question.correctAnswers || []).includes(
                              optionIndex,
                            )}
                            onCheckedChange={() =>
                              toggleCorrectAnswer(questionIndex, optionIndex)
                            }
                          />
                          <Input
                            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                            value={option}
                            onChange={(event) =>
                              updateOption(
                                questionIndex,
                                optionIndex,
                                event.target.value,
                              )
                            }
                            placeholder={`Answer ${optionIndex + 1}`}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        value={question.explanation}
                        onChange={(event) =>
                          updateQuestion(questionIndex, {
                            ...question,
                            explanation: event.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Optional feedback shown after the learner answers"
                      />
                    </div>
                    </article>
                  ))}
                </div>
              </section>

              <Dialog
                open={questionDialogOpen}
                onOpenChange={(open) => {
                  setQuestionDialogOpen(open);
                  if (!open) setEditingQuestionIndex(null);
                }}
              >
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuestionIndex === null
                        ? "Create a new question"
                        : `Edit question ${editingQuestionIndex + 1}`}
                    </DialogTitle>
                    <DialogDescription>
                      {editingQuestionIndex === null
                        ? "Complete the question below, then add it to the quiz list."
                        : "Update the details below, then save your changes."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 sm:grid-cols-[1fr_190px]">
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        value={questionDraft.question}
                        onChange={(event) =>
                          setQuestionDraft((draft) => ({
                            ...draft,
                            question: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Write the question learners will answer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Answer format</Label>
                      <Select
                        value={questionDraft.type || "single"}
                        onValueChange={(type: "single" | "multiple") =>
                          setQuestionDraft((draft) => ({
                            ...draft,
                            type,
                            correctAnswers:
                              type === "single"
                                ? [draft.correctAnswers?.[0] ?? 0]
                                : draft.correctAnswers?.length
                                  ? draft.correctAnswers
                                  : [0],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">One answer</SelectItem>
                          <SelectItem value="multiple">Multiple answers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer choices</Label>
                      <span className="text-xs text-muted-foreground">
                        Mark the correct answer
                      </span>
                    </div>
                    {questionDraft.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2"
                      >
                        <Checkbox
                          checked={(questionDraft.correctAnswers || []).includes(
                            optionIndex,
                          )}
                          onCheckedChange={() =>
                            toggleDraftCorrectAnswer(optionIndex)
                          }
                        />
                        <Input
                          className="border-0 shadow-none focus-visible:ring-0"
                          value={option}
                          onChange={(event) =>
                            setQuestionDraft((draft) => ({
                              ...draft,
                              options: draft.options.map((item, index) =>
                                index === optionIndex ? event.target.value : item,
                              ),
                            }))
                          }
                          placeholder={`Answer ${optionIndex + 1}`}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <Textarea
                      value={questionDraft.explanation}
                      onChange={(event) =>
                        setQuestionDraft((draft) => ({
                          ...draft,
                          explanation: event.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Optional feedback shown after the learner answers"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setQuestionDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addQuestion}>
                      {editingQuestionIndex === null
                        ? "Add & Create Next"
                        : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <section className="border-t border-border/60 pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Learner results
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A simple summary for the selected lesson.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      {selectedAttempts.length} attempts
                    </Badge>
                    <Badge variant="secondary">{passRate}% pass rate</Badge>
                    <Badge variant="secondary">{averageScore}% average</Badge>
                  </div>
                </div>

                {selectedAttempts.length === 0 ? (
                  <div className="rounded-xl bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    No quiz attempts yet.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/60">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-muted/30 text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Attempted</th>
                            <th className="px-4 py-3 font-medium">Score</th>
                            <th className="px-4 py-3 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAttempts
                            .slice(0, 10)
                            .map((attempt, index) => (
                              <tr
                                key={`${attempt.lesson_id}-${attempt.attempted_at}-${index}`}
                                className="border-t border-border/50"
                              >
                                <td className="px-4 py-3 text-muted-foreground">
                                  {new Date(
                                    attempt.attempted_at,
                                  ).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {attempt.score}/{attempt.total}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="secondary"
                                    className={
                                      attempt.passed
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                                    }
                                  >
                                    {attempt.passed ? "Passed" : "Try again"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
