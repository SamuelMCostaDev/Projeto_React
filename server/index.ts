/// <reference path="./src/types/express.d.ts" />

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const { PORT = 4000, JWT_SECRET = "secret", CORS_ORIGIN } = process.env as {
  PORT?: string | number;
  JWT_SECRET: string;
  CORS_ORIGIN?: string; // ex: "http://localhost:5173,http://127.0.0.1:5173"
};

/* ----------------------- CORS ----------------------- */
const allowedOrigins = CORS_ORIGIN?.split(",").map(s => s.trim()).filter(Boolean) ?? ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (como mobile apps, Postman, ou server-side requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueado para origem: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// REMOVA COMPLETAMENTE estas linhas problemáticas:
// app.options("*", cors({ origin: true, credentials: true }));
// app.options("*", cors());
/* ---------------------------------------------------- */
/* ---------------------------------------------------- */

app.use(express.json());

// healthcheck (útil pra testar se o server está de pé)
app.get("/health", (_req, res) => res.status(200).send("ok"));

function signToken(userId: number) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "1d" });
}

function auth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  try {
    const payload = token ? (jwt.verify(token, JWT_SECRET) as JwtPayload) : null;
    if (!payload || typeof payload.sub === "undefined") {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

/** Auth */
app.post("/auth/signup", async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ error: "dados inválidos" });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "email já usado" });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hash } });

  await prisma.account.create({ data: { userId: user.id, balance: 1000_00 } });
  res.json({ ok: true });
});

app.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const user = await prisma.user.findUnique({ where: { email }, include: { account: true } });
  if (!user) return res.status(401).json({ error: "credenciais" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "credenciais" });
  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    accountId: user.account?.id ?? null,
  });
});

/** Me */
app.get("/me", auth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { account: true },
  });
  res.json({
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    account: user?.account ?? null,
  });
});

/** Saldo */
app.get("/accounts/:id", auth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const acc = await prisma.account.findUnique({ where: { id } });
  if (!acc || acc.userId !== req.userId) return res.status(404).json({ error: "não encontrado" });
  res.json(acc);
});

/** Extrato */
app.get("/transactions", auth, async (req: Request, res: Response) => {
  const accountId = Number((req.query.accountId as string) ?? 0);
  const txs = await prisma.transaction.findMany({
    where: { OR: [{ fromId: accountId }, { toId: accountId }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(txs);
});

/** Transferência */
app.post("/transfer", auth, async (req: Request, res: Response) => {
  const { fromId, toId, amount } = req.body ?? {};
  const value = Number(amount || 0);
  if (!fromId || !toId || !value || value <= 0) return res.status(400).json({ error: "dados inválidos" });

  const from = await prisma.account.findUnique({ where: { id: Number(fromId) } });
  if (!from || from.userId !== req.userId) return res.status(403).json({ error: "forbidden" });

  const to = await prisma.account.findUnique({ where: { id: Number(toId) } });
  if (!to) return res.status(404).json({ error: "destino inexistente" });
  if (from.balance < value) return res.status(400).json({ error: "saldo insuficiente" });

  await prisma.$transaction([
    prisma.account.update({ where: { id: from.id }, data: { balance: { decrement: value } } }),
    prisma.account.update({ where: { id: to.id }, data: { balance: { increment: value } } }),
    prisma.transaction.create({ data: { fromId: from.id, toId: to.id, amount: value } }),
  ]);

  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`server on http://localhost:${PORT}`));
