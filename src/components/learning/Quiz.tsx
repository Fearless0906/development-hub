import { useState } from "react";
import { CheckCircle, XCircle, HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
}

export const Quiz = ({ questions, onComplete }: QuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [isComplete, setIsComplete] = useState(false);

  const question = questions[currentQuestion];

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);

    if (selectedAnswer === question.correctAnswer) {
      setScore(score + 1);
    }

    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      onComplete(score + (selectedAnswer === question.correctAnswer ? 1 : 0), questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers(new Array(questions.length).fill(null));
    setIsComplete(false);
  };

  if (isComplete) {
    const finalScore = score;
    const percentage = Math.round((finalScore / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="glass-card p-6 text-center">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
          passed ? "bg-green-500/20" : "bg-amber-500/20"
        )}>
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
          You scored {finalScore} out of {questions.length} ({percentage}%)
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i === currentQuestion
                  ? "bg-primary"
                  : answers[i] !== null
                  ? answers[i] === questions[i].correctAnswer
                    ? "bg-green-500"
                    : "bg-red-500"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <h4 className="text-lg font-semibold mb-4">{question.question}</h4>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctAnswer;
          const showCorrectness = showResult;

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
                  : "border-border opacity-50"
              )}
            >
              <div className="flex items-center justify-between">
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

      {/* Explanation */}
      {showResult && (
        <div className={cn(
          "p-4 rounded-lg mb-6",
          selectedAnswer === question.correctAnswer
            ? "bg-green-500/10 border border-green-500/30"
            : "bg-amber-500/10 border border-amber-500/30"
        )}>
          <p className="text-sm">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        {!showResult ? (
          <Button onClick={handleSubmitAnswer} disabled={selectedAnswer === null}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>
            {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
          </Button>
        )}
      </div>
    </div>
  );
};
