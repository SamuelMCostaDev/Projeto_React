// server/src/types/express.d.ts

// Augmenta o tipo global do Express (forma mais à prova de falhas)
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {}; // mantém como módulo
