import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { QuestionCard } from "@/components/qa/QuestionCard";
import { TagBadge } from "@/components/qa/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, TrendingUp, Clock, MessageSquare, Filter, Loader2 } from "lucide-react";

interface Question {
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

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  usage_count: number;
}

type SortOption = "newest" | "votes" | "unanswered";

const QA = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tagParam = searchParams.get("tag");
    if (tagParam) {
      setSelectedTags([tagParam]);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchQuestions();
    fetchTags();
  }, [sortBy, selectedTags]);

  useEffect(() => {
    if (user) {
      fetchUserVotes();
    }
  }, [user, questions]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
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
              color
            )
          )
        `);

      // Apply tag filter
      if (selectedTags.length > 0) {
        const { data: tagIds } = await supabase
          .from("tags")
          .select("id")
          .in("slug", selectedTags);
        
        if (tagIds && tagIds.length > 0) {
          const { data: questionIds } = await supabase
            .from("question_tags")
            .select("question_id")
            .in("tag_id", tagIds.map(t => t.id));
          
          if (questionIds && questionIds.length > 0) {
            query = query.in("id", questionIds.map(q => q.question_id));
          } else {
            setQuestions([]);
            setLoading(false);
            return;
          }
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "votes":
          query = query.order("votes_count", { ascending: false });
          break;
        case "unanswered":
          query = query.eq("answers_count", 0).order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("usage_count", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchUserVotes = async () => {
    if (!user || questions.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("votes")
        .select("voteable_id, value")
        .eq("user_id", user.id)
        .eq("voteable_type", "question")
        .in("voteable_id", questions.map(q => q.id));

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

  const handleTagClick = (slug: string) => {
    if (selectedTags.includes(slug)) {
      setSelectedTags(selectedTags.filter(t => t !== slug));
    } else {
      setSelectedTags([...selectedTags, slug]);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Questions
              </h1>
              <p className="text-muted-foreground">
                Ask questions, get answers, help others
              </p>
            </div>
            <Button variant="hero" size="lg" asChild>
              <Link to="/ask">
                <Plus className="h-5 w-5 mr-2" />
                Ask Question
              </Link>
            </Button>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === "newest" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("newest")}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Newest
                  </Button>
                  <Button
                    variant={sortBy === "votes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("votes")}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Top
                  </Button>
                  <Button
                    variant={sortBy === "unanswered" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("unanswered")}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Unanswered
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Filtered by:</span>
                  {selectedTags.map(slug => {
                    const tag = tags.find(t => t.slug === slug);
                    return tag ? (
                      <TagBadge
                        key={slug}
                        name={tag.name}
                        color={tag.color}
                        onClick={() => handleTagClick(slug)}
                        selected
                      />
                    ) : null;
                  })}
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Questions List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    No questions found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedTags.length > 0
                      ? "Try adjusting your search or filters"
                      : "Be the first to ask a question!"}
                  </p>
                  <Button variant="hero" asChild>
                    <Link to="/ask">Ask a Question</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQuestions.map((question) => (
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
                      tags={question.question_tags.map(qt => qt.tags)}
                      userVote={userVotes[question.id]}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
              <div className="glass-card p-5 sticky top-24">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      name={`${tag.name} (${tag.usage_count})`}
                      color={tag.color}
                      onClick={() => handleTagClick(tag.slug)}
                      selected={selectedTags.includes(tag.slug)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default QA;
