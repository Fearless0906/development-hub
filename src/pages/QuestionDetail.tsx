import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoteButton } from "@/components/qa/VoteButton";
import { TagBadge } from "@/components/qa/TagBadge";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, 
  Loader2, 
  Check, 
  MessageSquare, 
  Share2, 
  Flag,
  CheckCircle2,
  Eye,
  Edit3
} from "lucide-react";

interface Question {
  id: string;
  title: string;
  content: string;
  votes_count: number;
  answers_count: number;
  views_count: number;
  is_solved: boolean;
  accepted_answer_id: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    reputation: number;
  };
  question_tags: Array<{
    tags: {
      id: string;
      name: string;
      slug: string;
      color: string;
    };
  }>;
}

interface Answer {
  id: string;
  content: string;
  votes_count: number;
  is_accepted: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    reputation: number;
  };
}

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnswerPreview, setShowAnswerPreview] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
      incrementViews();
    }
  }, [id]);

  useEffect(() => {
    if (user && answers.length > 0) {
      fetchUserVotes();
    }
  }, [user, answers]);

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select(`
          *,
          profiles!questions_user_id_fkey (
            id,
            username,
            avatar_url,
            reputation
          ),
          question_tags (
            tags (
              id,
              name,
              slug,
              color
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setQuestion(data);
    } catch (error) {
      console.error("Error fetching question:", error);
      toast.error("Question not found");
      navigate("/questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from("answers")
        .select(`
          *,
          profiles!answers_user_id_fkey (
            id,
            username,
            avatar_url,
            reputation
          )
        `)
        .eq("question_id", id)
        .order("is_accepted", { ascending: false })
        .order("votes_count", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error("Error fetching answers:", error);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("votes")
        .select("voteable_id, value")
        .eq("user_id", user.id)
        .eq("voteable_type", "answer")
        .in("voteable_id", answers.map(a => a.id));

      if (error) throw error;
      
      const votesMap: Record<string, number> = {};
      data?.forEach(vote => {
        votesMap[vote.voteable_id] = vote.value;
      });
      setUserVotes(votesMap);
    } catch (error) {
      console.error("Error fetching user votes:", error);
    }
  };

  const incrementViews = async () => {
    if (!id) return;
    try {
      // Increment views directly on the question
      await supabase
        .from("questions")
        .update({ views_count: (question?.views_count || 0) + 1 })
        .eq("id", id);
    } catch (error) {
      // Silently fail - views aren't critical
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to answer");
      navigate("/auth");
      return;
    }

    if (answerContent.trim().length < 30) {
      toast.error("Answer must be at least 30 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("answers")
        .insert({
          question_id: id,
          user_id: user.id,
          content: answerContent,
        });

      if (error) throw error;

      toast.success("Answer posted successfully!");
      setAnswerContent("");
      fetchAnswers();
      if (question) {
        setQuestion({ ...question, answers_count: question.answers_count + 1 });
      }
    } catch (error) {
      console.error("Error posting answer:", error);
      toast.error("Failed to post answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!user || !question || user.id !== question.user_id) return;

    try {
      // Update question
      await supabase
        .from("questions")
        .update({ 
          accepted_answer_id: answerId,
          is_solved: true 
        })
        .eq("id", id);

      // Update answers
      await supabase
        .from("answers")
        .update({ is_accepted: false })
        .eq("question_id", id);

      await supabase
        .from("answers")
        .update({ is_accepted: true })
        .eq("id", answerId);

      toast.success("Answer accepted!");
      fetchQuestion();
      fetchAnswers();
    } catch (error) {
      console.error("Error accepting answer:", error);
      toast.error("Failed to accept answer");
    }
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6"
            onClick={() => navigate("/questions")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questions
          </Button>

          {/* Question */}
          <div className="glass-card p-6 md:p-8 mb-8">
            {/* Header */}
            <div className="flex items-start gap-2 mb-4">
              {question.is_solved && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary">
                  <Check className="h-3 w-3" />
                  Solved
                </span>
              )}
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {question.title}
              </h1>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
              <span>Asked {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
              <span>•</span>
              <span>{question.views_count} views</span>
            </div>

            <div className="flex gap-6">
              {/* Votes */}
              <div className="flex-shrink-0">
                <VoteButton
                  voteableType="question"
                  voteableId={question.id}
                  currentVotes={question.votes_count}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <MarkdownRenderer content={question.content} />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {question.question_tags.map(qt => (
                    <TagBadge key={qt.tags.id} name={qt.tags.name} color={qt.tags.color} />
                  ))}
                </div>

                {/* Actions & Author */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={copyLink}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={question.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(question.profiles.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        to={`/profile/${question.profiles.id}`}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        {question.profiles.username}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {question.profiles.reputation} reputation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Answers */}
          <div className="mb-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
            </h2>

            {answers.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No answers yet. Be the first to help!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map(answer => (
                  <div
                    key={answer.id}
                    className={`glass-card p-6 ${answer.is_accepted ? 'border-primary/50' : ''}`}
                  >
                    <div className="flex gap-6">
                      {/* Votes */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <VoteButton
                          voteableType="answer"
                          voteableId={answer.id}
                          currentVotes={answer.votes_count}
                          userVote={userVotes[answer.id]}
                        />
                        {answer.is_accepted && (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        )}
                        {!answer.is_accepted && user?.id === question.user_id && (
                          <button
                            onClick={() => handleAcceptAnswer(answer.id)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Accept this answer"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="mb-4">
                          <MarkdownRenderer content={answer.content} />
                        </div>

                        {/* Author */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            answered {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                          </span>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={answer.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(answer.profiles.username)}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              to={`/profile/${answer.profiles.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {answer.profiles.username}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Answer Form */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Your Answer
              </h3>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                <button
                  type="button"
                  onClick={() => setShowAnswerPreview(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !showAnswerPreview
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswerPreview(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    showAnswerPreview
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitAnswer}>
              {showAnswerPreview ? (
                <div className={`min-h-[200px] p-4 rounded-md border bg-secondary/30 border-border mb-4 ${
                  !answerContent.trim() ? "flex items-center justify-center" : ""
                }`}>
                  {answerContent.trim() ? (
                    <MarkdownRenderer content={answerContent} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Nothing to preview</p>
                  )}
                </div>
              ) : (
                <Textarea
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  placeholder="Write your answer here using Markdown. Use **bold**, *italic*, `code`, and ```code blocks```..."
                  rows={8}
                  className="bg-secondary/50 border-border resize-none mb-4 font-mono text-sm"
                />
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {answerContent.length} characters (minimum 30) • Supports Markdown
                </p>
                <Button type="submit" variant="hero" disabled={isSubmitting || !user}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Answer"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default QuestionDetail;
