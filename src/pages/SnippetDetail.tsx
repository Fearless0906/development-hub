import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoteButton } from "@/components/qa/VoteButton";
import { TagBadge } from "@/components/qa/TagBadge";
import { CodeBlock } from "@/components/code/CodeBlock";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, 
  Loader2, 
  Copy, 
  Check,
  GitFork,
  Eye,
  Share2,
  Edit,
  Trash2,
} from "lucide-react";
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

interface Snippet {
  id: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
  votes_count: number;
  views_count: number;
  forks_count: number;
  is_public: boolean;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    reputation: number;
  };
  snippet_tags: Array<{
    tags: {
      id: string;
      name: string;
      slug: string;
      color: string;
    };
  }>;
}

interface ForkedFrom {
  id: string;
  title: string;
  profiles: {
    username: string;
  };
}

const SnippetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [forkedFrom, setForkedFrom] = useState<ForkedFrom | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchSnippet();
      incrementViews();
    }
  }, [id]);

  useEffect(() => {
    if (user && snippet) {
      fetchUserVote();
    }
  }, [user, snippet]);

  const fetchSnippet = async () => {
    try {
      const { data, error } = await supabase
        .from("code_snippets")
        .select(`
          *,
          profiles!code_snippets_user_id_fkey (
            id,
            username,
            avatar_url,
            reputation
          ),
          snippet_tags (
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
      setSnippet(data);

      // Fetch forked from info
      if (data.forked_from) {
        const { data: forked } = await supabase
          .from("code_snippets")
          .select(`
            id,
            title,
            profiles!code_snippets_user_id_fkey (
              username
            )
          `)
          .eq("id", data.forked_from)
          .single();
        
        if (forked) {
          setForkedFrom(forked as ForkedFrom);
        }
      }
    } catch (error) {
      console.error("Error fetching snippet:", error);
      toast.error("Snippet not found");
      navigate("/snippets");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVote = async () => {
    if (!user || !snippet) return;
    
    try {
      const { data, error } = await supabase
        .from("votes")
        .select("value")
        .eq("user_id", user.id)
        .eq("voteable_type", "snippet")
        .eq("voteable_id", snippet.id)
        .maybeSingle();

      if (error) throw error;
      setUserVote(data?.value || null);
    } catch (error) {
      console.error("Error fetching user vote:", error);
    }
  };

  const incrementViews = async () => {
    if (!id) return;
    try {
      const { data: current } = await supabase
        .from("code_snippets")
        .select("views_count")
        .eq("id", id)
        .single();
      
      if (current) {
        await supabase
          .from("code_snippets")
          .update({ views_count: current.views_count + 1 })
          .eq("id", id);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!snippet || !user) return;

    try {
      const { error } = await supabase
        .from("code_snippets")
        .delete()
        .eq("id", snippet.id);

      if (error) throw error;
      toast.success("Snippet deleted");
      navigate("/snippets");
    } catch (error) {
      console.error("Error deleting snippet:", error);
      toast.error("Failed to delete snippet");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
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

  if (!snippet) return null;

  const isOwner = user?.id === snippet.user_id;

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
            onClick={() => navigate("/snippets")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Snippets
          </Button>

          {/* Snippet Card */}
          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-border/50">
              <div className="flex gap-6">
                {/* Votes */}
                <div className="flex-shrink-0">
                  <VoteButton
                    voteableType="snippet"
                    voteableId={snippet.id}
                    currentVotes={snippet.votes_count}
                    userVote={userVote}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Forked From */}
                  {forkedFrom && (
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      Forked from{" "}
                      <Link to={`/snippets/${forkedFrom.id}`} className="text-primary hover:underline">
                        {forkedFrom.title}
                      </Link>
                      {" "}by {forkedFrom.profiles.username}
                    </div>
                  )}

                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {snippet.title}
                  </h1>

                  {snippet.description && (
                    <p className="text-muted-foreground mb-4">{snippet.description}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="tag-badge">{snippet.language}</span>
                    {snippet.snippet_tags.map(st => (
                      <TagBadge key={st.tags.id} name={st.tags.name} color={st.tags.color} />
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {snippet.views_count} views
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      {snippet.forks_count} forks
                    </div>
                    <span>
                      Created {formatDistanceToNow(new Date(snippet.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code */}
            <div className="relative">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-md bg-secondary/80 backdrop-blur text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <CodeBlock code={snippet.code} language={snippet.language} maxHeight="600px" />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button variant="hero" size="sm" asChild>
                    <Link to={`/snippets/fork/${snippet.id}`}>
                      <GitFork className="h-4 w-4 mr-2" />
                      Fork
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  {isOwner && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/snippets/edit/${snippet.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Snippet?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your snippet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={snippet.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(snippet.profiles.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      to={`/profile/${snippet.profiles.id}`}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {snippet.profiles.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {snippet.profiles.reputation} reputation
                    </p>
                  </div>
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

export default SnippetDetail;
