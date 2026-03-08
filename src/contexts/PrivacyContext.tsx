import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PrivacyContextType {
  hidden: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  hidden: false,
  toggle: () => {},
  mask: (v) => v,
});

const MASK = "R$\u00A0••••";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem("finow_privacy") === "1";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem("finow_privacy", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const mask = useCallback((value: string) => (hidden ? MASK : value), [hidden]);

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
