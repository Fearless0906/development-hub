import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  api,
  getOAuthRedirectUrl,
  type OAuthProvider,
} from "@/integrations/django/api";

const isOAuthProvider = (value: string | undefined): value is OAuthProvider => {
  return value === "google" || value === "github";
};

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const completeOAuth = async () => {
      if (!isOAuthProvider(provider)) {
        toast.error("Unsupported OAuth provider");
        navigate("/auth", { replace: true });
        return;
      }

      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");
      const state = params.get("state");
      const oauthError = params.get("error");
      const errorDescription = params.get("error_description");

      if (oauthError) {
        toast.error(errorDescription || `OAuth failed: ${oauthError}`);
        navigate("/auth", { replace: true });
        return;
      }

      if (!code || !state) {
        toast.error("Missing OAuth code or state");
        navigate("/auth", { replace: true });
        return;
      }

      const redirectTo = getOAuthRedirectUrl(provider);

      const { error } = await api.auth.exchangeOAuthCode({
        provider,
        code,
        state,
        redirectTo,
      });

      if (error) {
        toast.error(error.message);
        navigate("/auth", { replace: true });
        return;
      }

      toast.success(
        `Signed in with ${provider === "google" ? "Google" : "GitHub"}`,
      );

      navigate("/", { replace: true });
    };

    void completeOAuth();
  }, [navigate, provider]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Completing sign in…</span>
      </div>
    </main>
  );
};

export default OAuthCallback;
