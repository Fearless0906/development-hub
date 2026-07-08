import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TagBadge } from "@/components/qa/TagBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  Search as SearchIcon, 
  Loader2, 
  HelpCircle, 
  MessageSquare, 
  Code2,
  Filter,
  X,
  Check,
  ArrowUpDown
} from "lucide-react";

interface QuestionResult {
  type: "question";
  id: string;
  title: string;
  content: string;
  votes_count: number;
  answers_count: number;
  is_solved: boolean;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  question_tags: Array<{
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface AnswerResult {
  type: "answer";
  id: string;
  content: string;
  votes_count: number;
  is_accepted: boolean;
  created_at: string;
  question_id: string;
  questions: {
    id: string;
    title: string;
  };
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface SnippetResult {
  type: "snippet";
  id: string;
  title: string;
  description: string | null;
  language: string;
  votes_count: number;
  views_count: number;
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
}

type SearchResult = QuestionResult | AnswerResult | SnippetResult;
type ContentType = "all" | "questions" | "answers" | "snippets";
type SortOption = "relevance" | "newest" | "votes";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(
    (searchParams.get("type") as ContentType) || "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    try {
      // Search questions
      if (contentType === "all" || contentType === "questions") {
        const { data: questions } = await supabase
          .from("questions")
          .select(`
            id, title, content, votes_count, answers_count, is_solved, created_at,
            profiles!questions_user_id_fkey (id, username, avatar_url),
            question_tags (tags (id, name, color))
          `)
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .order(sortBy === "newest" ? "created_at" : "votes_count", { ascending: false })
          .limit(20);

        questions?.forEach((q) => {
          allResults.push({ ...q, type: "question" } as QuestionResult);
        });
      }

      // Search answers
      if (contentType === "all" || contentType === "answers") {
        const { data: answers } = await supabase
          .from("answers")
          .select(`
            id, content, votes_count, is_accepted, created_at, question_id,
            questions!answers_question_id_fkey (id, title),
            profiles!answers_user_id_fkey (id, username, avatar_url)
          `)
          .ilike("content", searchTerm)
          .order(sortBy === "newest" ? "created_at" : "votes_count", { ascending: false })
          .limit(20);

        answers?.forEach((a) => {
          allResults.push({ ...a, type: "answer" } as AnswerResult);
        });
      }

      // Search snippets
      if (contentType === "all" || contentType === "snippets") {
        const { data: snippets } = await supabase
          .from("code_snippets")
          .select(`
            id, title, description, language, votes_count, views_count, created_at,
            profiles!code_snippets_user_id_fkey (id, username, avatar_url),
            snippet_tags (tags (id, name, color))
          `)
          .eq("is_public", true)
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .order(sortBy === "newest" ? "created_at" : "votes_count", { ascending: false })
          .limit(20);

        snippets?.forEach((s) => {
          allResults.push({ ...s, type: "snippet" } as SnippetResult);
        });
      }

      // Sort combined results
      if (sortBy === "newest") {
        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === "votes") {
        allResults.sort((a, b) => b.votes_count - a.votes_count);
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [contentType, sortBy]);

  useEffect(() => {
    const initialQuery = searchParams.get("q");
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [contentType, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query, type: contentType });
    performSearch(query);
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: null },
    { value: "questions", label: "Questions", icon: <HelpCircle className="h-4 w-4" /> },
    { value: "answers", label: "Answers", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "snippets", label: "Snippets", icon: <Code2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Search
            </h1>
            <p className="text-muted-foreground">
              Find questions, answers, and code snippets
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for anything..."
                  className="pl-12 h-12 text-base bg-secondary/50 border-border"
                  autoFocus
                />
              </div>
              <Button type="submit" variant="hero" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
              </Button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Content Type Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
              {contentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setContentType(type.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    contentType === type.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                {(["relevance", "newest", "votes"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      sortBy === sort
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasSearched ? (
            <div className="glass-card p-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Start searching
              </h3>
              <p className="text-muted-foreground">
                Enter a search term to find questions, answers, and code snippets
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No results found
              </h3>
              <p className="text-muted-foreground">
                Try different keywords or adjust your filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
              </p>

              {results.map((result) => (
                <div key={`${result.type}-${result.id}`} className="glass-card p-5">
                  {result.type === "question" && (
                    <QuestionResultCard result={result} query={query} highlightText={highlightText} truncateText={truncateText} getInitials={getInitials} />
                  )}
                  {result.type === "answer" && (
                    <AnswerResultCard result={result} query={query} highlightText={highlightText} truncateText={truncateText} getInitials={getInitials} />
                  )}
                  {result.type === "snippet" && (
                    <SnippetResultCard result={result} query={query} highlightText={highlightText} truncateText={truncateText} getInitials={getInitials} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Result Card Components
const QuestionResultCard = ({ 
  result, 
  query, 
  highlightText, 
  truncateText, 
  getInitials 
}: { 
  result: QuestionResult; 
  query: string;
  highlightText: (text: string, query: string) => React.ReactNode;
  truncateText: (text: string, maxLength?: number) => string;
  getInitials: (username: string) => string;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400">
        <HelpCircle className="h-3 w-3" />
        Question
      </span>
      {result.is_solved && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
          <Check className="h-3 w-3" />
          Solved
        </span>
      )}
    </div>
    <Link
      to={`/questions/${result.id}`}
      className="font-display text-lg font-semibold text-foreground hover:text-primary transition-colors block mb-2"
    >
      {highlightText(result.title, query)}
    </Link>
    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
      {highlightText(truncateText(result.content), query)}
    </p>
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {result.question_tags?.map((qt) => (
        <TagBadge key={qt.tags.id} name={qt.tags.name} color={qt.tags.color} size="sm" />
      ))}
    </div>
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>{result.votes_count} votes</span>
        <span>{result.answers_count} answers</span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={result.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {getInitials(result.profiles.username)}
          </AvatarFallback>
        </Avatar>
        <span>{result.profiles.username}</span>
        <span>• {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  </div>
);

const AnswerResultCard = ({ 
  result, 
  query, 
  highlightText, 
  truncateText, 
  getInitials 
}: { 
  result: AnswerResult; 
  query: string;
  highlightText: (text: string, query: string) => React.ReactNode;
  truncateText: (text: string, maxLength?: number) => string;
  getInitials: (username: string) => string;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400">
        <MessageSquare className="h-3 w-3" />
        Answer
      </span>
      {result.is_accepted && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
          <Check className="h-3 w-3" />
          Accepted
        </span>
      )}
    </div>
    <Link
      to={`/questions/${result.question_id}`}
      className="text-sm text-primary hover:underline block mb-2"
    >
      Re: {result.questions.title}
    </Link>
    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
      {highlightText(truncateText(result.content, 300), query)}
    </p>
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{result.votes_count} votes</span>
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={result.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {getInitials(result.profiles.username)}
          </AvatarFallback>
        </Avatar>
        <span>{result.profiles.username}</span>
        <span>• {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  </div>
);

const SnippetResultCard = ({ 
  result, 
  query, 
  highlightText, 
  truncateText, 
  getInitials 
}: { 
  result: SnippetResult; 
  query: string;
  highlightText: (text: string, query: string) => React.ReactNode;
  truncateText: (text: string, maxLength?: number) => string;
  getInitials: (username: string) => string;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400">
        <Code2 className="h-3 w-3" />
        Snippet
      </span>
      <span className="text-xs text-muted-foreground">{result.language}</span>
    </div>
    <Link
      to={`/snippets/${result.id}`}
      className="font-display text-lg font-semibold text-foreground hover:text-primary transition-colors block mb-2"
    >
      {highlightText(result.title, query)}
    </Link>
    {result.description && (
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {highlightText(truncateText(result.description), query)}
      </p>
    )}
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {result.snippet_tags?.map((st) => (
        <TagBadge key={st.tags.id} name={st.tags.name} color={st.tags.color} size="sm" />
      ))}
    </div>
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>{result.votes_count} votes</span>
        <span>{result.views_count} views</span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={result.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {getInitials(result.profiles.username)}
          </AvatarFallback>
        </Avatar>
        <span>{result.profiles.username}</span>
        <span>• {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  </div>
);

export default Search;
