import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthSession as Session,
  AuthUser as User,
  OAuthProvider,
} from "@/integrations/django/api";

import {
  api,
  API_ENDPOINTS,
  API_URL,
  AUTH_EXPIRED_EVENT,
  getOAuthRedirectUrl,
  isPrivateNetworkHostname,
} from "@/integrations/django/api";

import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;

  signUp: (
    email: string,
    password: string,
    profile: { firstName: string; lastName: string },
  ) => Promise<{ error: Error | null }>;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;

  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleExpiredSession = () => {
      if (!mounted) return;

      setSession(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);

    const {
      data: { subscription },
    } = api.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const restoreSession = async () => {
      try {
        const { data } = await api.auth.getSession();

        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch {
        if (!mounted) return;

        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;

      subscription.unsubscribe();

      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    profile: { firstName: string; lastName: string },
  ) => {
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();

    const { error } = await api.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await api.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signInWithOAuth = async (
    provider: OAuthProvider,
    options: { redirectTo: string },
  ) => {
    const redirectUrl = new URL(options.redirectTo);
    if (
      provider === "google" &&
      redirectUrl.protocol === "http:" &&
      isPrivateNetworkHostname(redirectUrl.hostname)
    ) {
      toast.error(
        "Google sign-in requires HTTPS when the app is opened through a LAN IP. Use email/password, localhost, or an HTTPS development URL.",
        { duration: 8000 },
      );
      return;
    }

    const { error } = await api.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      toast.error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await api.auth.signOut();

    if (error) {
      toast.error(error.message || "Failed to sign out");
      return;
    }

    setSession(null);
    setUser(null);
    toast.success("Signed out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,

        signInWithGoogle: () =>
          signInWithOAuth("google", {
            redirectTo: getOAuthRedirectUrl("google"),
          }),

        signInWithGitHub: () =>
          signInWithOAuth("github", {
            redirectTo: getOAuthRedirectUrl("github"),
          }),

        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
