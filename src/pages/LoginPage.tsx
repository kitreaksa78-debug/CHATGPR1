import React, { useEffect } from "react";
import { ChatGprIcon } from "../components/ChatGprIcon.js";
import { useAuth } from "../contexts/AuthContext.js";

export const LoginPage: React.FC = () => {
  const { login, isLoading, isAuthenticated, setUser } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.hash = "#/chat";
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionData = params.get("session");
    if (sessionData) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionData));
        if (session.user) {
          localStorage.setItem(
            "chatgpr_auth",
            JSON.stringify({
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              picture: session.user.picture,
            })
          );
          setUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            picture: session.user.picture,
          });
        }
        // Clean up URL: remove query params, keep hash
        window.history.replaceState({}, "", "/#/chat");
      } catch (e) {
        console.error("Failed to parse session data from OAuth callback", e);
      }
    }

    // Also check for error param
    const error = params.get("error");
    if (error) {
      console.error("OAuth error:", error);
      window.history.replaceState({}, "", "/#/login");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0D10]">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0D10] text-white px-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#6366F1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#8B5CF6]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full text-center animate-fadeIn">
        <div className="relative">
          <div className="absolute inset-0 bg-[#6366F1]/20 rounded-full blur-2xl" />
          <div className="relative w-16 h-16 rounded-full bg-[#171A21] border border-[#242933] flex items-center justify-center shadow-2xl shadow-[#6366F1]/20">
            <ChatGprIcon className="w-10 h-10" glow={true} />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            CHAT{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#818CF8] to-[#C084FC]">
              GPR
            </span>
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Sign in to continue to your AI assistant
          </p>
        </div>

        <div className="w-full p-6 rounded-2xl bg-[#111318] border border-[#242933] shadow-2xl space-y-5">
          <p className="text-xs text-[#64748B] font-khmer">
            សូមចូលដើម្បីបន្តប្រើប្រាស់ CHAT GPR
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#242933]" />
            <span className="text-[10px] text-[#475569]">or</span>
            <div className="flex-1 h-px bg-[#242933]" />
          </div>

          <button
            onClick={() => {
              localStorage.setItem(
                "chatgpr_auth",
                JSON.stringify({
                  id: "guest_" + Date.now(),
                  name: "Guest User",
                  email: "",
                  picture: "",
                })
              );
              setUser({
                id: "guest_" + Date.now(),
                name: "Guest User",
                email: "",
                picture: "",
              });
              window.location.hash = "#/chat";
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-[#242933] text-[#94A3B8] text-xs font-khmer hover:bg-[#171A21] hover:text-white transition-all"
          >
            ប្រើប្រាស់ជា Guest / Continue as Guest
          </button>
        </div>

        <button
          onClick={() => (window.location.hash = "#/")}
          className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
        >
          ← Back to Welcome
        </button>
      </div>
    </div>
  );
};
