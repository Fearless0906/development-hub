import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TagBadge } from "@/components/qa/TagBadge";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X, HelpCircle, Eye, Edit3 } from "lucide-react";
import { z } from "zod";

const questionSchema = z.object({
  title: z.string().min(15, "Title must be at least 15 characters").max(150, "Title must be less than 150 characters"),
  content: z.string().min(30, "Content must be at least 30 characters").max(10000, "Content must be less than 10000 characters"),
});

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const AskQuestion = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to ask a question");
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, slug, color")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = questionSchema.safeParse({ title, content });
    if (!result.success) {
      const fieldErrors: { title?: string; content?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === "title") fieldErrors.title = err.message;
        if (err.path[0] === "content") fieldErrors.content = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast.error("Please sign in to ask a question");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const slug = generateSlug(title);
      
      // Create question
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .insert({
          user_id: user.id,
          title,
          content,
          slug,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Add tags
      if (selectedTags.length > 0) {
        const { error: tagsError } = await supabase
          .from("question_tags")
          .insert(
            selectedTags.map(tag => ({
              question_id: question.id,
              tag_id: tag.id,
            }))
          );

        if (tagsError) throw tagsError;
      }

      toast.success("Question posted successfully!");
      navigate(`/questions/${question.id}`);
    } catch (error: any) {
      console.error("Error creating question:", error);
      toast.error("Failed to post question. Please try again.");
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
              Ask a Question
            </h1>
            <p className="text-muted-foreground">
              Get help from the community by asking a well-formed question
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="glass-card p-6">
              <Label htmlFor="title" className="text-foreground text-base font-semibold mb-2 block">
                Title
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Be specific and imagine you're asking a question to another person
              </p>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to center a div in CSS?"
                className={`bg-secondary/50 border-border ${errors.title ? 'border-destructive' : ''}`}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-2">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {title.length}/150 characters
              </p>
            </div>

            {/* Content */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="content" className="text-foreground text-base font-semibold">
                  Body
                </Label>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      !showPreview
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      showPreview
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Include all the information someone would need to answer your question. Supports Markdown.
              </p>
              
              {showPreview ? (
                <div className={`min-h-[240px] p-4 rounded-md border bg-secondary/30 border-border ${
                  !content.trim() ? "flex items-center justify-center" : ""
                }`}>
                  {content.trim() ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Nothing to preview</p>
                  )}
                </div>
              ) : (
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your problem in detail. Use **bold**, *italic*, `code`, and ```code blocks```..."
                  rows={10}
                  className={`bg-secondary/50 border-border resize-none font-mono text-sm ${errors.content ? 'border-destructive' : ''}`}
                />
              )}
              {errors.content && (
                <p className="text-sm text-destructive mt-2">{errors.content}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {content.length}/10000 characters
              </p>
            </div>

            {/* Tags */}
            <div className="glass-card p-6">
              <Label className="text-foreground text-base font-semibold mb-2 block">
                Tags
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Add up to 5 tags to describe what your question is about
              </p>

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

            {/* Tips */}
            <div className="glass-card p-6 border-primary/20">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Writing a good question</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Summarize your problem in a one-line title</li>
                    <li>• Describe what you've tried and what you expected</li>
                    <li>• Include relevant code and error messages</li>
                    <li>• Add appropriate tags to reach the right experts</li>
                  </ul>
                </div>
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
                    Posting...
                  </>
                ) : (
                  "Post Question"
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

export default AskQuestion;
