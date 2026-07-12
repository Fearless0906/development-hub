import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TagBadge } from "@/components/qa/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/integrations/django/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X, Code2 } from "lucide-react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedLanguages } from "@/components/code/CodeBlock";

const snippetSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  code: z.string().min(10, "Code must be at least 10 characters").max(50000, "Code must be less than 50000 characters"),
});

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const NewSnippet = () => {
  const { forkId } = useParams<{ forkId: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; code?: string }>({});
  const [forkedFromTitle, setForkedFromTitle] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to create a snippet");
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchTags();
    if (forkId) {
      fetchForkSource();
    }
  }, [forkId]);

  const fetchTags = async () => {
    try {
      const { data, error } = await api
        .from("tags")
        .select("id, name, slug, color")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchForkSource = async () => {
    if (!forkId) return;
    
    try {
      const { data, error } = await api
        .from("code_snippets")
        .select(`
          title,
          description,
          code,
          language,
          snippet_tags (
            tags (
              id,
              name,
              slug,
              color
            )
          )
        `)
        .eq("id", forkId)
        .single();

      if (error) throw error;
      
      setTitle(`Fork of ${data.title}`);
      setForkedFromTitle(data.title);
      setDescription(data.description || "");
      setCode(data.code);
      setLanguage(data.language);
      setSelectedTags(data.snippet_tags.map((st: any) => st.tags));
    } catch (error) {
      console.error("Error fetching fork source:", error);
      toast.error("Failed to load snippet to fork");
      navigate("/snippets");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = snippetSchema.safeParse({ title, code });
    if (!result.success) {
      const fieldErrors: { title?: string; code?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === "title") fieldErrors.title = err.message;
        if (err.path[0] === "code") fieldErrors.code = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast.error("Please sign in to create a snippet");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create snippet
      const { data: snippet, error: snippetError } = await api
        .from("code_snippets")
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          code,
          language,
          is_public: isPublic,
          forked_from: forkId || null,
        })
        .select()
        .single();

      if (snippetError) throw snippetError;

      // Update forks count if this is a fork
      if (forkId) {
        const { data: forkedSnippet } = await api
          .from("code_snippets")
          .select("forks_count")
          .eq("id", forkId)
          .single();
        
        if (forkedSnippet) {
          await api
            .from("code_snippets")
            .update({ forks_count: forkedSnippet.forks_count + 1 })
            .eq("id", forkId);
        }
      }

      // Add tags
      if (selectedTags.length > 0) {
        const { error: tagsError } = await api
          .from("snippet_tags")
          .insert(
            selectedTags.map(tag => ({
              snippet_id: snippet.id,
              tag_id: tag.id,
            }))
          );

        if (tagsError) throw tagsError;
      }

      toast.success(forkId ? "Snippet forked successfully!" : "Snippet created successfully!");
      navigate(`/snippets/${snippet.id}`);
    } catch (error: any) {
      console.error("Error creating snippet:", error);
      toast.error("Failed to create snippet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: Tag) => {
    if (selectedTags.length >= 5) {
      toast.error("You can only add up to 5 tags");
      return;
    }
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagSearch("");
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const filteredTags = availableTags.filter(
    tag =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !selectedTags.find(t => t.id === tag.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {forkId ? "Fork Snippet" : "Create Snippet"}
            </h1>
            <p className="text-muted-foreground">
              {forkId 
                ? `Forking from "${forkedFromTitle}"`
                : "Share a useful code snippet with the community"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="glass-card p-6">
              <Label htmlFor="title" className="text-foreground text-base font-semibold mb-2 block">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React useDebounce Hook"
                className={`bg-secondary/50 border-border ${errors.title ? 'border-destructive' : ''}`}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-2">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="glass-card p-6">
              <Label htmlFor="description" className="text-foreground text-base font-semibold mb-2 block">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this snippet does..."
                rows={3}
                className="bg-secondary/50 border-border resize-none"
              />
            </div>

            {/* Language */}
            <div className="glass-card p-6">
              <Label className="text-foreground text-base font-semibold mb-2 block">
                Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Code */}
            <div className="glass-card p-6">
              <Label htmlFor="code" className="text-foreground text-base font-semibold mb-2 block">
                Code
              </Label>
              <Textarea
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                rows={15}
                className={`bg-secondary/50 border-border resize-none font-mono text-sm ${errors.code ? 'border-destructive' : ''}`}
              />
              {errors.code && (
                <p className="text-sm text-destructive mt-2">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {code.length} characters
              </p>
            </div>

            {/* Tags */}
            <div className="glass-card p-6">
              <Label className="text-foreground text-base font-semibold mb-2 block">
                Tags <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}30`,
                      }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag Search */}
              <Input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="bg-secondary/50 border-border mb-3"
              />

              {/* Available Tags */}
              {tagSearch && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {filteredTags.slice(0, 10).map(tag => (
                    <TagBadge
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      onClick={() => addTag(tag)}
                    />
                  ))}
                  {filteredTags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No matching tags found</p>
                  )}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground text-base font-semibold">
                    Public Snippet
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isPublic 
                      ? "Anyone can view and fork this snippet" 
                      : "Only you can view this snippet"}
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {forkId ? "Forking..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    {forkId ? "Fork Snippet" : "Create Snippet"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewSnippet;
