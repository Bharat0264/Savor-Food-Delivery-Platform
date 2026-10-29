"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import { State } from "@/lib/model";
import { freshSeed } from "@/lib/seed";
import { repository } from "@/lib/repository";
const Context = createContext<{
  state: State;
  setState: (fn: (s: State) => State) => void;
  reset: () => void;
  toast: (s: string) => void;
}>({} as never);
export function Provider({ children }: { children: ReactNode }) {
  const [state, set] = useState(freshSeed);
  const [ready, setReady] = useState(false);
  const [message, messageSet] = useState("");
  useEffect(() => {
    set(repository.load());
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key === "savor-demo-v1") set(repository.load());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (ready) repository.save(state);
  }, [state, ready]);
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => messageSet(""), 3500);
      return () => clearTimeout(t);
    }
  }, [message]);
  return (
    <Context.Provider
      value={{
        state,
        setState: (fn) => set(fn),
        reset: () => set(repository.reset()),
        toast: messageSet,
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      {message && (
        <div role="status" className="toast">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export const useDemo = () => useContext(Context);
