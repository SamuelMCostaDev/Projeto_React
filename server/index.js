require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");


const resend = new Resend(process.env.RESEND_API_KEY);


const app = express();
const prisma = new PrismaClient();

// ====== MIDDLEWARES BÁSICOS ======
app.use(cors());
app.use(express.json());

// ====== HELPER: AUTH JWT ======
function generateToken(user) {
  const payload = { userId: user.id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const token = auth.slice(7);
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}



async function sendAutoDebitEmail(to, name) {
  const appName = process.env.APP_NAME || "Banco Demo";
  const from =
    process.env.EMAIL_FROM || "Banco Demo <onboarding@resend.dev>";

  const result = await resend.emails.send({
    from,
    to,
    subject: "Débito automático ativado",
    html: `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>O <strong>débito automático</strong> da sua conta foi ativado com sucesso.</p>
      <p>A partir de agora, seus pagamentos recorrentes poderão ser realizados automaticamente conforme configurado no aplicativo.</p>
      <p>Se não foi você quem fez essa alteração, entre em contato com o suporte imediatamente.</p>
      <p>Abraços,<br />${appName}</p>
    `,
  });

  console.log("Email Resend enviado:", result.id || result);
}

async function sendPasswordResetEmail(to, name, token) {
  const appName = process.env.APP_NAME || "Banco Demo";
  const from =
    process.env.EMAIL_FROM || "Banco Demo <onboarding@resend.dev>";

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: `${appName} - Redefinição de senha`,
      html: `
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <p><a href="${resetUrl}" target="_blank" rel="noreferrer">${resetUrl}</a></p>
        <p>Este link é válido por 1 hora.</p>
        <p>Se você não fez esta solicitação, pode ignorar este e-mail com segurança.</p>
        <p>Abraços,<br />${appName}</p>
      `,
    });

    if (result.error) {
      console.error("Erro Resend (reset):", result.error);
      throw new Error(
        result.error.message || "Falha ao enviar e-mail de recuperação"
      );
    }

    console.log("Email de reset enviado, id:", result.data?.id || result);
  } catch (err) {
    console.error("Erro ao enviar e-mail de reset:", err);
    throw err; // deixa a rota saber que deu erro
  }
}




// ====== ROTAS DE AUTENTICAÇÃO ======
// Registro de usuário + criação de conta
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email e password são obrigatórios" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        account: {
          create: {
            balance: 0,
          },
        },
      },
      include: { account: true },
    });

    const token = generateToken(user);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      accountId: user.account?.id || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao registrar" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email e password são obrigatórios" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Usuário ou senha inválidos" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Usuário ou senha inválidos" });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      accountId: user.account?.id || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// Dados do usuário logado (útil para o AuthContext do front)
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { account: true },
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      accountId: user.account?.id || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Esqueci minha senha
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "email é obrigatório" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Para não expor quais e-mails existem, sempre respondemos "ok"
    if (!user) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao iniciar recuperação de senha:", err);
    return res
      .status(500)
      .json({ error: "Erro ao iniciar recuperação de senha" });
  }
});


// ====== ROTAS DE NEGÓCIO (PROTEGIDAS) ======
app.use(authMiddleware);

// GET /users -> lista contatos com account
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        account: {
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      account: u.account ? { id: u.account.id } : null,
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// GET /accounts/:id -> detalhes da conta
app.get("/accounts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const account = await prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        balance: true,
      },
    });

    if (!account) return res.status(404).json({ error: "Conta não encontrada" });

    return res.json(account);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar conta" });
  }
});

// GET /transactions?accountId=123 -> extrato
app.get("/transactions", async (req, res) => {
  try {
    const accountId = Number(req.query.accountId);
    if (!accountId) {
      return res.status(400).json({ error: "accountId é obrigatório" });
    }

    const txs = await prisma.transaction.findMany({
      where: {
        OR: [{ fromId: accountId }, { toId: accountId }],
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(txs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar transações" });
  }
});

// POST /transfer { fromId, toId, amount }
app.post("/transfer", async (req, res) => {
  const { fromId, toId, amount } = req.body || {};

  if (!fromId || !toId || !amount || amount <= 0) {
    return res.status(400).json({ error: "fromId, toId e amount (>0) são obrigatórios" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fromAcc = await tx.account.findUnique({
        where: { id: fromId },
      });
      const toAcc = await tx.account.findUnique({
        where: { id: toId },
      });

      if (!fromAcc || !toAcc) {
        throw new Error("Conta de origem ou destino não encontrada");
      }

      if (fromAcc.balance < amount) {
        const err = new Error("Saldo insuficiente");
        err.code = "INSUFFICIENT_FUNDS";
        throw err;
      }

      const updatedFrom = await tx.account.update({
        where: { id: fromId },
        data: {
          balance: fromAcc.balance - amount,
        },
      });

      const updatedTo = await tx.account.update({
        where: { id: toId },
        data: {
          balance: toAcc.balance + amount,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          fromId,
          toId,
          amount,
        },
      });

      return { updatedFrom, updatedTo, transaction };
    });

    return res.status(201).json(result.transaction);
  } catch (err) {
    console.error(err);
    if (err.code === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro ao realizar transferência" });
  }
});

// ====== ROTAS DE DÉBITO AUTOMÁTICO ======

// GET /auto-debit?accountId=123
app.get("/auto-debit", async (req, res) => {
  try {
    const accountId = Number(req.query.accountId);
    if (!accountId) {
      return res.status(400).json({ error: "accountId é obrigatório" });
    }

    const cfg = await prisma.autoDebit.findUnique({
      where: { accountId },
    });

    return res.json(cfg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar débito automático" });
  }
});

// PUT /auto-debit { accountId, active }
app.put("/auto-debit", async (req, res) => {
  try {
    const { accountId, active } = req.body || {};
    if (!accountId || typeof active !== "boolean") {
      return res.status(400).json({ error: "accountId e active são obrigatórios" });
    }

    const existing = await prisma.autoDebit.findUnique({
      where: { accountId },
    });

    const wasActive = existing?.active || false;

    let cfg;
    if (existing) {
      cfg = await prisma.autoDebit.update({
        where: { accountId },
        data: { active },
      });
    } else {
      cfg = await prisma.autoDebit.create({
        data: { accountId, active },
      });
    }

    // Se acabou de ativar (false -> true), manda e-mail
    if (!wasActive && active) {
      try {
        const account = await prisma.account.findUnique({
          where: { id: accountId },
          include: { user: true },
        });

        if (account && account.user && account.user.email) {
          await sendAutoDebitEmail(account.user.email, account.user.name);
        }
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de débito automático:", emailErr);
        // Não quebramos a resposta por conta de falha no e-mail
      }
    }

    return res.json(cfg);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao salvar débito automático" });
  }
});

// ====== START ======
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
