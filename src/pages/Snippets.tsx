import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SnippetCard } from "@/components/code/SnippetCard";
import { TagBadge } from "@/components/qa/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/integrations/django/api";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, TrendingUp, Clock, Code2, Filter, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedLanguages } from "@/components/code/CodeBlock";

interface Snippet {
  id: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
  votes_count: number;
  views_count: number;
  forks_count: number;
  created_at: string;
  forked_from: string | null;
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
  forked_snippet?: {
    id: string;
    title: string;
  } | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  usage_count: number;
}

type SortOption = "newest" | "votes" | "forks";

const Snippets = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const langParam = searchParams.get("language");
    if (langParam) {
      setSelectedLanguage(langParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSnippets();
    fetchTags();
  }, [sortBy, selectedLanguage, selectedTags]);

  useEffect(() => {
    if (user && snippets.length > 0) {
      fetchUserVotes();
    }
  }, [user, snippets]);

  const fetchSnippets = async () => {
    setLoading(true);
    try {
      let query = api
        .from("code_snippets")
        .select(`
          *,
          profiles!code_snippets_user_id_fkey (
            id,
            username,
            avatar_url
          ),
          snippet_tags (
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq("is_public", true);

      // Apply language filter
      if (selectedLanguage) {
        query = query.eq("language", selectedLanguage);
      }

      // Apply tag filter
      if (selectedTags.length > 0) {
        const { data: tagIds } = await api
          .from("tags")
          .select("id")
          .in("slug", selectedTags);
        
        if (tagIds && tagIds.length > 0) {
          const { data: snippetIds } = await api
            .from("snippet_tags")
            .select("snippet_id")
            .in("tag_id", tagIds.map(t => t.id));
          
          if (snippetIds && snippetIds.length > 0) {
            query = query.in("id", snippetIds.map(s => s.snippet_id));
          } else {
            setSnippets([]);
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
        case "forks":
          query = query.order("forks_count", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch forked_from titles if needed
      const snippetsWithForks = await Promise.all((data || []).map(async (snippet) => {
        if (snippet.forked_from) {
          const { data: forkedSnippet } = await api
            .from("code_snippets")
            .select("id, title")
            .eq("id", snippet.forked_from)
            .single();
          return { ...snippet, forked_snippet: forkedSnippet };
        }
        return { ...snippet, forked_snippet: null };
      }));
      
      setSnippets(snippetsWithForks);
    } catch (error) {
      console.error("Error fetching snippets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await api
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
    if (!user || snippets.length === 0) return;
    
    try {
      const { data, error } = await api
        .from("votes")
        .select("voteable_id, value")
        .eq("user_id", user.id)
        .eq("voteable_type", "snippet")
        .in("voteable_id", snippets.map(s => s.id));

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

  const filteredSnippets = snippets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
                Code Snippets
              </h1>
              <p className="text-muted-foreground">
                Share, discover, and fork useful code snippets
              </p>
            </div>
            <Button variant="hero" size="lg" asChild>
              <Link to="/snippets/new">
                <Plus className="h-5 w-5 mr-2" />
                New Snippet
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
                    placeholder="Search snippets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border"
                  />
                </div>
                <Select value={selectedLanguage || "all"} onValueChange={(val) => setSelectedLanguage(val === "all" ? "" : val)}>
                  <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {supportedLanguages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Selected Filters */}
              {(selectedLanguage || selectedTags.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Filtered by:</span>
                  {selectedLanguage && (
                    <span
                      className="tag-badge cursor-pointer"
                      onClick={() => setSelectedLanguage("")}
                    >
                      {selectedLanguage} ×
                    </span>
                  )}
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
                    onClick={() => {
                      setSelectedLanguage("");
                      setSelectedTags([]);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Snippets List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSnippets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    No snippets found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedLanguage || selectedTags.length > 0
                      ? "Try adjusting your search or filters"
                      : "Be the first to share a code snippet!"}
                  </p>
                  <Button variant="hero" asChild>
                    <Link to="/snippets/new">Create a Snippet</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredSnippets.map((snippet) => (
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
                      tags={snippet.snippet_tags.map(st => st.tags)}
                      userVote={userVotes[snippet.id]}
                      forkedFrom={snippet.forked_snippet}
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
                      name={tag.name}
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

export default Snippets;
