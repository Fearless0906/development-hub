import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { api } from "@/integrations/django/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  bookmarkableType: "question" | "snippet" | "lesson";
  bookmarkableId: string;
  className?: string;
}

export const BookmarkButton = ({
  bookmarkableType,
  bookmarkableId,
  className,
}: BookmarkButtonProps) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      return;
    }

    const checkBookmark = async () => {
      const { data } = await api
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("bookmarkable_id", bookmarkableId)
        .eq("bookmarkable_type", bookmarkableType)
        .maybeSingle();

      setIsBookmarked(!!data);
    };

    checkBookmark();
  }, [user, bookmarkableId, bookmarkableType]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to bookmark");
      return;
    }

    setIsLoading(true);

    try {
      if (isBookmarked) {
        const { error } = await api
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("bookmarkable_id", bookmarkableId)
          .eq("bookmarkable_type", bookmarkableType);

        if (error) throw error;
        setIsBookmarked(false);
        toast.success("Bookmark removed");
      } else {
        const { error } = await api.from("bookmarks").insert({
          user_id: user.id,
          bookmarkable_id: bookmarkableId,
          bookmarkable_type: bookmarkableType,
        });

        if (error) throw error;
        setIsBookmarked(true);
        toast.success("Bookmarked!");
      }
    } catch (error) {
      toast.error("Failed to update bookmark");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      disabled={isLoading}
      className={cn(
        "p-2 rounded-md transition-colors",
        isBookmarked
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
        isLoading && "opacity-50 cursor-not-allowed",
        className,
      )}
      title={isBookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
    </button>
  );
};
