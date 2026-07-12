import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { QuestionCard } from "@/components/qa/QuestionCard";
import { SnippetCard } from "@/components/code/SnippetCard";
import { api } from "@/integrations/django/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bookmark, MessageSquare, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BookmarkedQuestion {
  id: string;
  title: string;
  content: string;
  slug: string;
  votes_count: number;
  answers_count: number;
  views_count: number;
  is_solved: boolean;
  created_at: string;
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
      color: string;
    };
  }>;
}

interface BookmarkedSnippet {
  id: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
  votes_count: number;
  views_count: number;
  forks_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  snippet_tags: Array<{
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  forked_from_snippet: { id: string; title: string } | null;
}

const Bookmarks = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<BookmarkedQuestion[]>([]);
  const [snippets, setSnippets] = useState<BookmarkedSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchBookmarks = async () => {
      setLoading(true);

      // Fetch bookmarked questions
      const { data: questionBookmarks } = await api
        .from("bookmarks")
        .select("bookmarkable_id")
        .eq("user_id", user.id)
        .eq("bookmarkable_type", "question");

      if (questionBookmarks && questionBookmarks.length > 0) {
        const questionIds = questionBookmarks.map((b) => b.bookmarkable_id);
        const { data: questionsData } = await api
          .from("questions")
          .select(`
            id, title, content, slug, votes_count, answers_count, views_count,
            is_solved, created_at,
            profiles:user_id (id, username, avatar_url, reputation),
            question_tags (tags (id, name, color))
          `)
          .in("id", questionIds);

        if (questionsData) {
          setQuestions(questionsData as unknown as BookmarkedQuestion[]);
        }
      }

      // Fetch bookmarked snippets
      const { data: snippetBookmarks } = await api
        .from("bookmarks")
        .select("bookmarkable_id")
        .eq("user_id", user.id)
        .eq("bookmarkable_type", "snippet");

      if (snippetBookmarks && snippetBookmarks.length > 0) {
        const snippetIds = snippetBookmarks.map((b) => b.bookmarkable_id);
        const { data: snippetsData } = await api
          .from("code_snippets")
          .select(`
            id, title, description, code, language, votes_count, views_count,
            forks_count, created_at,
            profiles:user_id (id, username, avatar_url),
            snippet_tags (tags (id, name, color)),
            forked_from_snippet:forked_from (id, title)
          `)
          .in("id", snippetIds);

        if (snippetsData) {
          setSnippets(snippetsData as unknown as BookmarkedSnippet[]);
        }
      }

      // Fetch user votes
      const { data: votesData } = await api
        .from("votes")
        .select("voteable_id, value")
        .eq("user_id", user.id);

      if (votesData) {
        const votesMap: Record<string, number> = {};
        votesData.forEach((v) => {
          votesMap[v.voteable_id] = v.value;
        });
        setUserVotes(votesMap);
      }

      setLoading(false);
    };

    fetchBookmarks();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bookmark className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold">My Bookmarks</h1>
            </div>
            <p className="text-muted-foreground">
              Your saved questions and code snippets
            </p>
          </div>

          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="questions" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Questions ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="snippets" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Snippets ({snippets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              {questions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No bookmarked questions</h3>
                  <p className="text-muted-foreground">
                    Bookmark questions to save them for later
                  </p>
                </div>
              ) : (
                questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    id={question.id}
                    title={question.title}
                    content={question.content}
                    slug={question.slug}
                    votesCount={question.votes_count}
                    answersCount={question.answers_count}
                    viewsCount={question.views_count}
                    isSolved={question.is_solved}
                    createdAt={question.created_at}
                    author={{
                      id: question.profiles.id,
                      username: question.profiles.username,
                      avatarUrl: question.profiles.avatar_url || undefined,
                      reputation: question.profiles.reputation,
                    }}
                    tags={question.question_tags.map((qt) => qt.tags)}
                    userVote={userVotes[question.id]}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="snippets" className="space-y-4">
              {snippets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No bookmarked snippets</h3>
                  <p className="text-muted-foreground">
                    Bookmark code snippets to save them for later
                  </p>
                </div>
              ) : (
                snippets.map((snippet) => (
                  <SnippetCard
                    key={snippet.id}
                    id={snippet.id}
                    title={snippet.title}
                    description={snippet.description || undefined}
                    code={snippet.code}
                    language={snippet.language}
                    votesCount={snippet.votes_count}
                    viewsCount={snippet.views_count}
                    forksCount={snippet.forks_count}
                    createdAt={snippet.created_at}
                    author={{
                      id: snippet.profiles.id,
                      username: snippet.profiles.username,
                      avatarUrl: snippet.profiles.avatar_url || undefined,
                    }}
                    tags={snippet.snippet_tags.map((st) => st.tags)}
                    userVote={userVotes[snippet.id]}
                    forkedFrom={snippet.forked_from_snippet}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Bookmarks;
