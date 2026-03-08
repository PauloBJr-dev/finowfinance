import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Plan = "free" | "premium" | "lifetime";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscribed: boolean;
  plan: Plan;
  subscriptionEnd: string | null;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.warn("check-subscription error:", error.message);
        return;
      }
      const newSubscribed = !!data?.subscribed;
      const newPlan = (data?.plan as Plan) ?? "free";
      const newEnd = data?.subscription_end ?? null;
      // Bail-out: only update state if values actually changed
      setSubscribed((prev) => (prev === newSubscribed ? prev : newSubscribed));
      setPlan((prev) => (prev === newPlan ? prev : newPlan));
      setSubscriptionEnd((prev) => (prev === newEnd ? prev : newEnd));
    } catch (err) {
      console.warn("check-subscription failed:", err);
    }
  }, []);

  // Start / stop polling — 5 min interval, only when tab is visible
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkSubscription();
      }
    }, 5 * 60_000);
  }, [checkSubscription]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN" && sess) {
          setTimeout(checkSubscription, 0);
          startPolling();
        }
        if (event === "SIGNED_OUT") {
          setSubscribed(false);
          setPlan("free");
          setSubscriptionEnd(null);
          stopPolling();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (sess) {
        checkSubscription();
        startPolling();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopPolling();
    };
  }, [checkSubscription, startPolling, stopPolling]);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('register', {
        body: { email, password, name, phone: phone || null },
      });
      if (fnError) return { error: new Error(fnError.message || 'Erro ao criar conta') };
      if (data?.error) return { error: new Error(data.error) };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Erro ao criar conta') };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      subscribed, plan, subscriptionEnd,
      signUp, signIn, signOut,
      refreshSubscription: checkSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
