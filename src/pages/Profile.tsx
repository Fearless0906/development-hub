import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Camera,
  Award,
  MessageSquare,
  HelpCircle,
  Code2,
  Calendar,
  Globe,
  Github,
  Edit,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";
import { QuestionCard } from "@/components/qa/QuestionCard";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  github_username: string | null;
  reputation: number;
  questions_count: number;
  answers_count: number;
  created_at: string;
}

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

interface Answer {
  id: string;
  content: string;
  votes_count: number;
  is_accepted: boolean;
  created_at: string;
  questions: {
    id: string;
    title: string;
  };
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    username: "",
    display_name: "",
    bio: "",
    website: "",
    github_username: "",
  });

  const isOwnProfile = user && (id === user.id || !id);
  const profileId = id || user?.id;

  useEffect(() => {
    if (profileId) {
      fetchProfile();
      fetchUserQuestions();
      fetchUserAnswers();
    } else if (!user) {
      navigate("/auth");
    }
  }, [profileId, user]);

  const fetchProfile = async () => {
    if (!profileId) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        username: data.username || "",
        display_name: data.display_name || "",
        bio: data.bio || "",
        website: data.website || "",
        github_username: data.github_username || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Profile not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserQuestions = async () => {
    if (!profileId) return;
    
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
              color
            )
          )
        `)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const fetchUserAnswers = async () => {
    if (!profileId) return;
    
    try {
      const { data, error } = await supabase
        .from("answers")
        .select(`
          id,
          content,
          votes_count,
          is_accepted,
          created_at,
          questions (
            id,
            title
          )
        `)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error("Error fetching answers:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editForm.username,
          display_name: editForm.display_name || null,
          bio: editForm.bio || null,
          website: editForm.website || null,
          github_username: editForm.github_username || null,
        })
        .eq("id", user.id);

      if (error) {
        if (error.message.includes("unique")) {
          toast.error("Username is already taken");
          return;
        }
        throw error;
      }

      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
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

  if (!profile) return null;

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
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Profile Header */}
          <div className="glass-card p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 relative group">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                    {getInitials(profile.username)}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </label>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={editForm.username}
                          onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="bg-secondary/50 border-border"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="bg-secondary/50 border-border resize-none"
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={editForm.website}
                          onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                          className="bg-secondary/50 border-border"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="github">GitHub Username</Label>
                        <Input
                          id="github"
                          value={editForm.github_username}
                          onChange={(e) => setEditForm(prev => ({ ...prev, github_username: e.target.value }))}
                          className="bg-secondary/50 border-border"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="hero"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                          {profile.display_name || profile.username}
                        </h1>
                        <p className="text-muted-foreground">@{profile.username}</p>
                      </div>
                      {isOwnProfile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    {profile.bio && (
                      <p className="text-foreground mb-4">{profile.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                      </div>
                      {profile.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          Website
                        </a>
                      )}
                      {profile.github_username && (
                        <a
                          href={`https://github.com/${profile.github_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Github className="h-4 w-4" />
                          {profile.github_username}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            {!isEditing && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Award className="h-5 w-5 text-accent" />
                    <span className="font-display text-2xl font-bold text-foreground">
                      {profile.reputation}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reputation</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span className="font-display text-2xl font-bold text-foreground">
                      {profile.questions_count}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="font-display text-2xl font-bold text-foreground">
                      {profile.answers_count}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Answers</p>
                </div>
              </div>
            )}
          </div>

          {/* Activity Tabs */}
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="questions" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Questions ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="answers" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Answers ({answers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions">
              {questions.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No questions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
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
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="answers">
              {answers.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No answers yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {answers.map((answer) => (
                    <div key={answer.id} className="glass-card-hover p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1 text-sm">
                          <span className={`font-bold ${answer.votes_count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {answer.votes_count}
                          </span>
                          <span className="text-muted-foreground text-xs">votes</span>
                          {answer.is_accepted && (
                            <Check className="h-5 w-5 text-primary mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/questions/${answer.questions.id}`}
                            className="font-display text-foreground hover:text-primary transition-colors font-medium line-clamp-1"
                          >
                            {answer.questions.title}
                          </a>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {answer.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Answered {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
