import { useState } from "react";
import { CheckCircle, HelpCircle, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LessonContent } from "@/components/markdown/RichTextEditor";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  type?: "single" | "multiple";
  explanation: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  passScore: number;
  unlimitedAttempts: boolean;
  reviewAnswers: boolean;
}

export interface QuizAttemptAnswer {
  questionId: string;
  selectedAnswers: number[];
  correctAnswers: number[];
  correct: boolean;
}

interface QuizProps {
  questions: QuizQuestion[] | QuizData;
  onComplete: (
    score: number,
    total: number,
    details?: {
      passed: boolean;
      percentage: number;
      answers: QuizAttemptAnswer[];
      passScore: number;
    },
  ) => void;
}

export const normalizeQuizData = (
  quiz: QuizQuestion[] | QuizData | null | undefined,
): QuizData => {
  if (!quiz) {
    return {
      questions: [],
      passScore: 70,
      unlimitedAttempts: true,
      reviewAnswers: true,
    };
  }

  if (Array.isArray(quiz)) {
    return {
      questions: quiz,
      passScore: 70,
      unlimitedAttempts: true,
      reviewAnswers: true,
    };
  }

  return {
    questions: quiz.questions || [],
    passScore: quiz.passScore ?? 70,
    unlimitedAttempts: quiz.unlimitedAttempts ?? true,
    reviewAnswers: quiz.reviewAnswers ?? true,
  };
};

const getCorrectAnswers = (question: QuizQuestion) =>
  question.correctAnswers?.length
    ? question.correctAnswers
    : question.correctAnswer !== undefined
      ? [question.correctAnswer]
      : [];

const sameAnswers = (left: number[], right: number[]) => {
  const leftSorted = [...left].sort((a, b) => a - b);
  const rightSorted = [...right].sort((a, b) => a - b);

  return (
    leftSorted.length === rightSorted.length &&
    leftSorted.every((answer, index) => answer === rightSorted[index])
  );
};

export const Quiz = ({ questions, onComplete }: QuizProps) => {
  const quiz = normalizeQuizData(questions);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<QuizAttemptAnswer[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const question = quiz.questions[currentQuestion];
  const isMultiple = question?.type === "multiple";

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;

    if (isMultiple) {
      setSelectedAnswers((currentAnswers) =>
        currentAnswers.includes(index)
          ? currentAnswers.filter((answer) => answer !== index)
          : [...currentAnswers, index],
      );
      return;
    }

    setSelectedAnswers([index]);
  };

  const handleSubmitAnswer = () => {
    if (!question || selectedAnswers.length === 0) return;

    const correctAnswers = getCorrectAnswers(question);
    const correct = sameAnswers(selectedAnswers, correctAnswers);
    const nextAnswers = [
      ...answers,
      {
        questionId: question.id,
        selectedAnswers,
        correctAnswers,
        correct,
      },
    ];

    setAnswers(nextAnswers);

    if (correct) {
      setScore(score + 1);
    }

    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (!question) return;

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswers([]);
      setShowResult(false);
      return;
    }

    const finalScore = score;
    const percentage =
      quiz.questions.length > 0
        ? Math.round((finalScore / quiz.questions.length) * 100)
        : 0;
    const passed = percentage >= quiz.passScore;

    setIsComplete(true);
    onComplete(finalScore, quiz.questions.length, {
      passed,
      percentage,
      answers,
      passScore: quiz.passScore,
    });
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setScore(0);
    setAnswers([]);
    setIsComplete(false);
  };

  if (quiz.questions.length === 0) {
    return null;
  }

  if (isComplete) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= quiz.passScore;

    return (
      <div className="glass-card p-6 text-center">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
            passed ? "bg-green-500/20" : "bg-amber-500/20",
          )}
        >
          {passed ? (
            <CheckCircle className="h-10 w-10 text-green-500" />
          ) : (
            <HelpCircle className="h-10 w-10 text-amber-500" />
          )}
        </div>
        <h3 className="font-display text-2xl font-bold mb-2">
          {passed ? "Great Job!" : "Keep Practicing!"}
        </h3>
        <p className="text-muted-foreground mb-4">
          You scored {score} out of {quiz.questions.length} ({percentage}%).
          Passing score is {quiz.passScore}%.
        </p>
        {quiz.unlimitedAttempts && (
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </span>
        <div className="flex gap-1">
          {quiz.questions.map((item, index) => {
            const answer = answers[index];

            return (
              <div
                key={item.id}
                className={cn(
                  "w-2 h-2 rounded-full",
                  index === currentQuestion
                    ? "bg-primary"
                    : answer
                      ? answer.correct
                        ? "bg-green-500"
                        : "bg-red-500"
                      : "bg-muted",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold">{question.question}</h4>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
          {isMultiple ? "Multiple answers" : "One answer"}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswers.includes(index);
          const isCorrect = getCorrectAnswers(question).includes(index);
          const showCorrectness = showResult && quiz.reviewAnswers;

          return (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={showResult}
              className={cn(
                "w-full p-4 rounded-lg border text-left transition-all",
                !showCorrectness && isSelected
                  ? "border-primary bg-primary/10"
                  : !showCorrectness
                    ? "border-border hover:border-primary/50 hover:bg-secondary/50"
                    : showCorrectness && isCorrect
                      ? "border-green-500 bg-green-500/10"
                      : showCorrectness && isSelected && !isCorrect
                        ? "border-red-500 bg-red-500/10"
                        : "border-border opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{option}</span>
                {showCorrectness && isCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {showCorrectness && isSelected && !isCorrect && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResult && quiz.reviewAnswers && (
        <div
          className={cn(
            "p-4 rounded-lg mb-6",
            sameAnswers(selectedAnswers, getCorrectAnswers(question))
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-amber-500/10 border border-amber-500/30",
          )}
        >
          <p className="mb-2 text-sm font-semibold">Explanation:</p>
          <LessonContent
            content={
              question.explanation?.trim() || "<p>No explanation provided.</p>"
            }
            className="max-w-none text-sm sm:text-sm [&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_blockquote]:my-3 [&_pre]:my-2 [&_h1]:mt-3 [&_h1]:mb-2 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:mt-3 [&_h3]:mb-2 [&_h4]:mt-3 [&_h4]:mb-2 [&_h5]:mt-3 [&_h5]:mb-2"
          />
        </div>
      )}

      <div className="flex justify-end">
        {!showResult ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswers.length === 0}
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>
            {currentQuestion < quiz.questions.length - 1
              ? "Next Question"
              : "See Results"}
          </Button>
        )}
      </div>
    </div>
  );
};
