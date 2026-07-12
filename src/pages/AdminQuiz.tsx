import { useEffect, useMemo, useState } from "react";
import { BarChart3, HelpCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { api } from "@/integrations/django/api";
import {
  normalizeQuizData,
  QuizData,
  QuizQuestion,
} from "@/components/learning/Quiz";
import { Course, CourseModule, Lesson } from "@/types/learning";
import { toast } from "sonner";

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

const AdminQuiz = () => {
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

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);
  const selectedAttempts = attempts.filter(
    (attempt) => attempt.lesson_id === selectedLessonId,
  );
  const passedAttempts = selectedAttempts.filter((attempt) => attempt.passed);
  const averageScore =
    selectedAttempts.length > 0
      ? Math.round(
          selectedAttempts.reduce(
            (sum, attempt) =>
              sum + (attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0),
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

      const [{ data: coursesData }, { data: modulesData }, { data: lessonsData }, { data: attemptsData }] =
        await Promise.all([
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

  return (
    <AdminLayout
      title="Quiz"
      description="Build lesson quizzes, configure passing rules, and review attempt statistics."
      actions={
        <Button onClick={handleSave} disabled={saving || !selectedLesson}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Quiz
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-2xl font-bold">{lessonsWithQuiz}</p>
              <p className="text-sm text-muted-foreground">Lessons with quiz</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-2xl font-bold">{selectedAttempts.length}</p>
              <p className="text-sm text-muted-foreground">Stored attempts</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-2xl font-bold">{passRate}%</p>
              <p className="text-sm text-muted-foreground">Pass rate</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-2xl font-bold">{averageScore}%</p>
              <p className="text-sm text-muted-foreground">Average score</p>
            </div>
          </div>

          <section className="rounded-lg border border-border/60 bg-card p-5">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr]">
              <div className="space-y-2">
                <Label>Lesson</Label>
                <Select value={selectedLessonId} onValueChange={handleLessonChange}>
                  <SelectTrigger>
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
                <Label>Pass score</Label>
                <Input
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
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">Unlimited attempts</p>
                  <p className="text-xs text-muted-foreground">
                    Let users retry
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
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">Review answers</p>
                  <p className="text-xs text-muted-foreground">
                    Show feedback
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
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Supports multiple choice and multiple-answer questions.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setQuiz((currentQuiz) => ({
                    ...currentQuiz,
                    questions: [...currentQuiz.questions, blankQuestion()],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            {quiz.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-lg border border-border/60 bg-card p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      Question {questionIndex + 1}
                    </h3>
                    <Badge variant="secondary">
                      {question.type === "multiple"
                        ? "Multiple answers"
                        : "Multiple choice"}
                    </Badge>
                  </div>
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
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="space-y-2">
                    <Label>Question text</Label>
                    <Textarea
                      value={question.question}
                      onChange={(event) =>
                        updateQuestion(questionIndex, {
                          ...question,
                          question: event.target.value,
                        })
                      }
                      rows={2}
                      placeholder="What should learners answer?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Multiple choice</SelectItem>
                        <SelectItem value="multiple">
                          Multiple answers
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Label>Options and correct answers</Label>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <Checkbox
                        checked={(question.correctAnswers || []).includes(
                          optionIndex,
                        )}
                        onCheckedChange={() =>
                          toggleCorrectAnswer(questionIndex, optionIndex)
                        }
                      />
                      <Input
                        value={option}
                        onChange={(event) =>
                          updateOption(
                            questionIndex,
                            optionIndex,
                            event.target.value,
                          )
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Answer review explanation</Label>
                  <Textarea
                    value={question.explanation}
                    onChange={(event) =>
                      updateQuestion(questionIndex, {
                        ...question,
                        explanation: event.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Explain why the answer is correct."
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-border/60 bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quiz Statistics
            </h2>
            {selectedAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attempts stored for this lesson yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-border/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Attempted</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAttempts.slice(0, 10).map((attempt, index) => (
                      <tr
                        key={`${attempt.lesson_id}-${attempt.attempted_at}-${index}`}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-3 py-3 text-muted-foreground">
                          {new Date(attempt.attempted_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3">
                          {attempt.score}/{attempt.total}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant="secondary"
                            className={
                              attempt.passed
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                            }
                          >
                            {attempt.passed ? "Passed" : "Failed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminQuiz;
