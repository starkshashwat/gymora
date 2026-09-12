"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Mail, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Google SVG Icon
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

interface AuthModalProps {
  /**
   * The text to display on the trigger button
   */
  triggerText?: string;
  /**
   * Callback when login is attempted
   */
  onLogin?: (provider: string) => void;
  /**
   * Optional className for the trigger button
   */
  className?: string;
  /**
   * Whether to display as an inline card instead of a modal
   */
  isInline?: boolean;
  /**
   * Mode: 'signup' for Gym Owner Sign Up, 'signin' for Sign In
   */
  mode?: 'signup' | 'signin';
}

function AuthModal({
  triggerText = "Sign up / Sign in",
  onLogin,
  className,
  isInline = false,
  mode = "signup",
}: AuthModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(isInline);
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingGoogle, setLoadingGoogle] = React.useState(false);

  const container: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const handleGoogleLogin = async () => {
    if (onLogin) {
      onLogin("Google");
      return;
    }

    try {
      setLoadingGoogle(true);
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        console.warn("Google OAuth fallback:", error.message);
        router.push(mode === "signup" ? "/onboarding" : "/dashboard");
      }
    } catch {
      router.push(mode === "signup" ? "/onboarding" : "/dashboard");
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    document.cookie = "gymora_session=true; path=/; max-age=2592000; SameSite=Lax";

    setTimeout(() => {
      setIsLoading(false);
      router.push(mode === "signup" ? "/onboarding" : "/dashboard");
    }, 400);
  };

  const modalBody = (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="relative w-full max-w-[380px] overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 ring-1 ring-zinc-950/5 text-left"
    >
      {!isInline && (
        <div className="absolute right-4 top-4">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-900 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <motion.div variants={item} className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {mode === "signup" ? "Create Gym Account" : "Welcome back"}
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 font-normal">
          {mode === "signup"
            ? "Sign up as Gym Owner to manage payments & dues"
            : "Sign in to your account to continue"}
        </p>
      </motion.div>

      {/* 1. Only Google Button (prominent & clean) */}
      <motion.div variants={item}>
        <button
          type="button"
          disabled={loadingGoogle}
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {loadingGoogle ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-400" />
          ) : (
            <GoogleIcon className="h-5 w-5 shrink-0" />
          )}
          <span>Continue with Google</span>
        </button>
      </motion.div>

      {/* 2. Divider */}
      <motion.div variants={item} className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-zinc-400 dark:bg-zinc-950 font-medium tracking-wider">
            Or continue with email
          </span>
        </div>
      </motion.div>

      {/* 3. Continue with your email */}
      <motion.div variants={item}>
        <form onSubmit={handleEmailSubmit} className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@gymora.fit"
            className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-11 pr-12 text-sm outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:focus:border-zinc-100 dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 flex items-center justify-center bg-zinc-900 text-zinc-50 transition-transform hover:scale-95 active:scale-90 dark:bg-zinc-50 dark:text-zinc-900 shadow-sm"
            title="Continue with email"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </form>
      </motion.div>

      {/* Quick Demo Access */}
      <motion.div variants={item} className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-900 text-center">
        <button
          type="button"
          onClick={() => {
            document.cookie = "gymora_session=true; path=/; max-age=2592000; SameSite=Lax";
            router.push("/dashboard");
          }}
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          ⚡ Instant Demo Owner Sign-In
        </button>
      </motion.div>

      {/* Terms */}
      <motion.div variants={item} className="mt-4 text-center">
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          By clicking continue, you agree to our{" "}
          <a
            href="#"
            className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="underline hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </motion.div>
  );

  if (isInline) {
    return <div className="w-full flex justify-center">{modalBody}</div>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 dark:focus-visible:ring-zinc-300 shadow-sm",
          className,
        )}
      >
        {triggerText}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm dark:bg-zinc-950/50"
            />
            {modalBody}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export { AuthModal, type AuthModalProps };
export default AuthModal;
