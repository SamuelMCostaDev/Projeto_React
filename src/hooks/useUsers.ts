import { useEffect, useMemo, useRef, useState } from "react";

export type User = { id: number; name: string; email: string };

type Options = {
  
  enabled?: boolean;

  retry?: number;
  
  url?: string;
};

export function useUsers(opts?: Options) {
  const { enabled = true, retry = 0, url = "https://jsonplaceholder.typicode.com/users" } =
    opts || {};

  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  
  const [tick, setTick] = useState(0);
  const refetch = () => setTick((x) => x + 1);

 
  const stableUrl = useMemo(() => url, [url]);
  const retryRef = useRef(retry);

  useEffect(() => {
    if (!enabled) {
    
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      let attempt = 0;
      const max = 1 + (retryRef.current ?? 0);

      while (attempt < max) {
        try {
          const res = await fetch(stableUrl, { signal: ctrl.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: User[] = await res.json();
          if (!alive) return;
          setUsers(data);
          setLoading(false);
          return; 
        } catch (err: any) {
          if (ctrl.signal.aborted) return; 
          attempt++;
          if (attempt >= max) {
            if (!alive) return;
            setError(String(err?.message ?? err));
            setLoading(false);
            return;
          }
          // pequeno backoff (200ms, 400ms, 600ms…)
          await new Promise((r) => setTimeout(r, 200 * attempt));
        }
      }
    }

    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [enabled, stableUrl, tick]);

  const status: "idle" | "loading" | "error" | "success" =
    !enabled ? "idle" : loading ? "loading" : error ? "error" : "success";

 
  return { users, loading, error, refetch, status };
}
