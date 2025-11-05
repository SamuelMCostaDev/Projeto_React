import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "../lib/api";

type User = { id: number; name: string; email: string };
type Auth = { 
  user: User | null; 
  accountId: number | null; 
  login(e: string, p: string): Promise<void>; 
  logout(): void; 
  loading: boolean; 
};

const Ctx = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

   
    async function loadUser() {
      try {
        const data = await api("/me");
        setUser(data.user);
        setAccountId(data.account?.id ?? null);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        setToken(null); 
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function login(email: string, password: string) {
    try {
      
      const res = await api("/auth/login", { 
        method: "POST", 
        json: { email, password } 
      });
      
      setToken(res.token);
      setUser(res.user);
      setAccountId(res.accountId);
    } catch (error: any) {
      console.error("Erro no login:", error);
      throw error; 
    }
  }

  function logout() { 
    setToken(null); 
    setUser(null); 
    setAccountId(null); 
  }

  const value: Auth = {
    user, 
    accountId, 
    login, 
    logout,
    loading
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);