import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import QA from "./pages/QA";
import AskQuestion from "./pages/AskQuestion";
import QuestionDetail from "./pages/QuestionDetail";
import Profile from "./pages/Profile";
import Snippets from "./pages/Snippets";
import NewSnippet from "./pages/NewSnippet";
import SnippetDetail from "./pages/SnippetDetail";
import Leaderboard from "./pages/Leaderboard";
import Search from "./pages/Search";
import Bookmarks from "./pages/Bookmarks";
import Learning from "./pages/Learning";
import CourseDetail from "./pages/CourseDetail";
import Playground from "./pages/Playground";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import Quiz from "./pages/Quiz";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/questions" element={<QA />} />
              <Route path="/questions/:id" element={<QuestionDetail />} />
              <Route path="/ask" element={<AskQuestion />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/snippets" element={<Snippets />} />
              <Route path="/snippets/new" element={<NewSnippet />} />
              <Route path="/snippets/fork/:forkId" element={<NewSnippet />} />
              <Route path="/snippets/:id" element={<SnippetDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/search" element={<Search />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/learning/:courseId" element={<CourseDetail />} />
              <Route path="/playground" element={<Playground />} />
              <Route
                path="/auth/callback/:provider"
                element={<OAuthCallback />}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
