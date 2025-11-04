import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "../lib/api";

type User = { id: number; name: string; email: string };
type Auth = { 
  user: User | null; 
  accountId: number | null; 
  login(e: string, p: string): Promise<void>; 
  logout(): void; 
  loading: boolean; // Adicionei loading state
};

const Ctx = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Carrega os dados do usuário
    async function loadUser() {
      try {
        const data = await api("/me");
        setUser(data.user);
        setAccountId(data.account?.id ?? null);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        setToken(null); // Remove token inválido
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function login(email: string, password: string) {
    try {
      // CORREÇÃO: Use 'json' em vez de 'body'
      const res = await api("/auth/login", { 
        method: "POST", 
        json: { email, password } // ← MUDEI PARA 'json'
      });
      
      setToken(res.token);
      setUser(res.user);
      setAccountId(res.accountId);
    } catch (error: any) {
      console.error("Erro no login:", error);
      throw error; // Re-lança o erro para o componente capturar
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