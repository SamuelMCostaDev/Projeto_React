require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


const nodemailer = require("nodemailer");

// Transporter global usando Outlook / Hotmail
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-mail.outlook.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // 587 = STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Opcional: testar conexão ao subir a API
mailer.verify((err, success) => {
  if (err) {
    console.error("[mailer] Falha ao conectar no SMTP:", err.message);
  } else {
    console.log("[mailer] Conexão SMTP OK");
  }
});



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
  // ⚠️ NUNCA aplicar auth em rotas públicas de autenticação
  if (
    req.path.startsWith("/auth/") && // qualquer coisa em /auth/...
    req.path !== "/auth/me" // se um dia você criar /auth/me protegido
  ) {
    return next();
  }

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




async function sendEmailVerification(to, name, token) {
  const appName = process.env.APP_NAME || "Banco Demo";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(
    token
  )}`;

  console.log("[verify-email] Enviando e-mail de verificação para:", to);
  console.log("  URL:", verifyUrl);

  await mailer.sendMail({
    from,
    to,
    subject: `${appName} - Confirme seu e-mail`,
    html: `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Obrigado por criar sua conta no <strong>${appName}</strong>.</p>
      <p>Clique no link abaixo para confirmar seu e-mail e liberar o acesso:</p>
      <p><a href="${verifyUrl}" target="_blank" rel="noreferrer">${verifyUrl}</a></p>
      <p>Este link é válido por 24 horas.</p>
      <p>Se você não fez este cadastro, pode ignorar este e-mail.</p>
      <p>Abraços,<br />${appName}</p>
    `,
  });

  console.log("[verify-email] E-mail enviado com sucesso.");
}







async function sendAutoDebitEmail(to, name) {
  const appName = process.env.APP_NAME || "Banco Demo";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  console.log("[auto-debit] Enviando e-mail para:", to);

  await mailer.sendMail({
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

  console.log("[auto-debit] E-mail de débito automático enviado.");
}


async function sendPasswordResetEmail(to, name, token) {
  const appName = process.env.APP_NAME || "Banco Demo";
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  console.log("[reset-password] Enviando e-mail para:", to);

  await mailer.sendMail({
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

  console.log("[reset-password] E-mail enviado com sucesso.");
}


function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomCharges() {
  const descriptions = [
    "Uber",
    "iFood",
    "Netflix",
    "Spotify",
    "Amazon",
    "Padaria Central",
    "Posto Shell",
    "Farmácia Popular",
  ];

  const count = randomInt(3, 6); // 3 a 6 gastos
  const charges = [];

  for (let i = 0; i < count; i++) {
    const desc = descriptions[randomInt(0, descriptions.length - 1)];
    const amount = randomInt(2000, 50000); // R$ 20,00 a R$ 500,00
    charges.push({
      description: desc,
      amount,
      paid: false,
    });
  }

  return charges;
}



// ====== ROTAS DE AUTENTICAÇÃO ======
// Registro de usuário + criação de conta
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email e password são obrigatórios" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // 👇 gera token de verificação (24h)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        emailVerified: false,
        verifyToken,
        verifyTokenExpires,
        account: {
          create: {
            balance: 0,
          },
        },
      },
      include: { account: true },
    });

    // dispara e-mail E SE DER ERRO a requisição falha
await sendEmailVerification(user.email, user.name, verifyToken);

return res.status(201).json({
  ok: true,
  message: "Usuário registrado. Verifique seu e-mail para ativar a conta.",
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


    // 👇 novo: exigir e-mail confirmado
    if (!user.emailVerified) {
      return res
        .status(403)
        .json({ error: "Confirme seu e-mail antes de fazer login." });
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

// Redefinir senha com token
app.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "token e password são obrigatórios" });
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
    });

    const now = new Date();

    if (!reset || reset.usedAt || reset.expiresAt < now) {
      return res
        .status(400)
        .json({ error: "Token inválido ou expirado. Solicite um novo link." });
    }

    const user = await prisma.user.findUnique({
      where: { id: reset.userId },
    });

    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });

      await tx.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: now },
      });
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao redefinir senha:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha." });
  }
});



// Confirmação de e-mail
app.get("/auth/verify-email", async (req, res) => {
  try {
    const raw = req.query.token;
    const token = (Array.isArray(raw) ? raw[0] : raw || "").toString().trim();

    console.log("[verify-email] Token recebido:", token);

    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório" });
    }

    const now = new Date();

    // como verifyToken é unique no schema, usa findUnique
    const user = await prisma.user.findUnique({
      where: { verifyToken: token },
    });

    if (!user) {
      console.log("[verify-email] Nenhum usuário encontrado com esse token");
      return res
        .status(400)
        .json({ error: "Token inválido ou expirado. Faça um novo cadastro." });
    }

    if (!user.verifyTokenExpires || user.verifyTokenExpires <= now) {
      console.log(
        "[verify-email] Token expirado para user id=",
        user.id,
        " expires=",
        user.verifyTokenExpires
      );
      return res
        .status(400)
        .json({ error: "Token inválido ou expirado. Faça um novo cadastro." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpires: null,
      },
    });

    console.log("[verify-email] E-mail confirmado para user id=", user.id);

    return res.json({ ok: true, message: "E-mail confirmado com sucesso." });
  } catch (err) {
    console.error("Erro ao verificar e-mail:", err);
    return res
      .status(500)
      .json({ error: "Erro ao confirmar e-mail. Tente novamente." });
  }
});




// ====== ROTAS DE NEGÓCIO (PROTEGIDAS) ======
app.use(authMiddleware);


// GET /card?accountId=123 -> dados do cartão + fatura + gastos
app.get("/card", async (req, res) => {
  try {
    const accountId = Number(req.query.accountId);
    if (!accountId) {
      return res.status(400).json({ error: "accountId é obrigatório" });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    // buscamos cartão + gastos não pagos
    let card = await prisma.creditCard.findUnique({
      where: { accountId },
      include: {
        charges: {
          where: { paid: false },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // se não existir cartão, criamos um com gastos aleatórios
    if (!card) {
      const last4 = String(1000 + Math.floor(Math.random() * 9000));

      card = await prisma.creditCard.create({
        data: {
          accountId,
          brand: "Visa",
          last4,
          limit: 500000, // R$ 5.000,00
          charges: {
            create: generateRandomCharges(),
          },
        },
        include: {
          charges: {
            where: { paid: false },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } else if (card.charges.length === 0) {
      // se já existe cartão mas não tem gastos em aberto, gera uma nova fatura
      card = await prisma.creditCard.update({
        where: { id: card.id },
        data: {
          charges: {
            create: generateRandomCharges(),
          },
        },
        include: {
          charges: {
            where: { paid: false },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    // recalcula valor da fatura com base nos charges não pagos
    const invoiceAmount = card.charges.reduce(
      (sum, c) => sum + c.amount,
      0
    );

    if (card.invoiceAmount !== invoiceAmount) {
      card = await prisma.creditCard.update({
        where: { id: card.id },
        data: { invoiceAmount },
        include: {
          charges: {
            where: { paid: false },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    const availableLimit = card.limit - card.invoiceAmount;

    return res.json({
      id: card.id,
      brand: card.brand,
      last4: card.last4,
      limit: card.limit,
      invoiceAmount: card.invoiceAmount,
      availableLimit,
      charges: card.charges,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro ao buscar informações do cartão" });
  }
});



// POST /card/pay { accountId } -> paga a fatura do cartão
app.post("/card/pay", async (req, res) => {
  const { accountId } = req.body || {};

  if (!accountId) {
    return res.status(400).json({ error: "accountId é obrigatório" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId },
      });

      if (!account) throw new Error("Conta não encontrada");

      const card = await tx.creditCard.findUnique({
        where: { accountId },
        include: {
          charges: {
            where: { paid: false },
          },
        },
      });

      if (!card) throw new Error("Cartão não encontrado");

      const unpaidCharges = card.charges;
      const total = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);

      if (total === 0) {
        const err = new Error("Nenhuma fatura em aberto");
        err.code = "NO_INVOICE";
        throw err;
      }

      if (account.balance < total) {
        const err = new Error("Saldo insuficiente para pagar a fatura");
        err.code = "INSUFFICIENT_FUNDS";
        throw err;
      }

      // debita da conta
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: { balance: account.balance - total },
      });

      // registra transação de saída (para o "banco do cartão")
      await tx.transaction.create({
        data: {
          fromId: accountId,
          toId: null,
          amount: total,
        },
      });

      // marca todos os gastos como pagos
      await tx.cardCharge.updateMany({
        where: { cardId: card.id, paid: false },
        data: { paid: true },
      });

      // zera valor da fatura
      const updatedCard = await tx.creditCard.update({
        where: { id: card.id },
        data: { invoiceAmount: 0 },
        include: {
          charges: {
            where: { paid: false },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const availableLimit = updatedCard.limit - updatedCard.invoiceAmount;

      return {
        account: updatedAccount,
        card: {
          id: updatedCard.id,
          brand: updatedCard.brand,
          last4: updatedCard.last4,
          limit: updatedCard.limit,
          invoiceAmount: updatedCard.invoiceAmount,
          availableLimit,
          charges: updatedCard.charges,
        },
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    if (err.code === "INSUFFICIENT_FUNDS" || err.code === "NO_INVOICE") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro ao pagar fatura" });
  }
});



// GET /users -> lista contatos simples (para Dashboard)
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

// GET /users-with-transactions -> usado pela tela "Histórico de Transações"
app.get("/users-with-transactions", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        account: {
          include: {
            txsFrom: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            txsTo: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = users.map((u) => {
      const acc = u.account;

      let recentTx = [];
      if (acc) {
        recentTx = [...acc.txsFrom, ...acc.txsTo]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            fromId: t.fromId,
            toId: t.toId,
            amount: t.amount,
            createdAt: t.createdAt,
          }));
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        account: acc
          ? {
              id: acc.id,
              userId: acc.userId,
              balance: acc.balance,
              createdAt: acc.createdAt,
            }
          : null,
        recentTx,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Erro ao listar usuários com transações" });
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

app.put("/auto-debit", async (req, res) => {
  try {
    const { accountId, active, dueDay } = req.body || {};

    if (!accountId || typeof active !== "boolean") {
      return res
        .status(400)
        .json({ error: "accountId e active são obrigatórios" });
    }

    // normaliza dia
    let normalizedDueDay;
    if (typeof dueDay === "number") {
      if (dueDay < 1 || dueDay > 28) {
        return res
          .status(400)
          .json({ error: "dueDay deve ser um número entre 1 e 28" });
      }
      normalizedDueDay = dueDay;
    } else if (dueDay === null) {
      normalizedDueDay = null;
    }

    const existing = await prisma.autoDebit.findUnique({
      where: { accountId },
    });

    // montar objeto dinâmico
    const dataToSave = { active };
    if (normalizedDueDay !== undefined) {
      dataToSave.dueDay = normalizedDueDay;
    }

    // ATUALIZA OU CRIA CONFIG
    let cfg;
    let statusChanged = false;

    if (existing) {
      statusChanged = existing.active !== active;

      cfg = await prisma.autoDebit.update({
        where: { accountId },
        data: dataToSave,
      });
    } else {
      statusChanged = true; // primeira vez sempre muda

      cfg = await prisma.autoDebit.create({
        data: {
          accountId,
          ...dataToSave,
        },
      });
    }

    // ☑️ BUSCAR DADOS DO USER
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account || !account.user) {
      console.error("Usuário da conta não encontrado.");
    }

    // ☑️ ENVIA EMAIL SE O STATUS MUDOU
    if (statusChanged) {
      const user = account.user;

      if (active) {
        await mailer.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Débito automático ativado",
          html: `
            <p>Olá, <strong>${user.name}</strong>!</p>
            <p>O débito automático foi <strong>ativado</strong> com sucesso.</p>
          `,
        });
      } else {
        await mailer.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Débito automático desativado",
          html: `
            <p>Olá, <strong>${user.name}</strong>!</p>
            <p>O débito automático foi <strong>desativado</strong>.</p>
          `,
        });
      }

      console.log("[auto-debit] Email enviado.");
    }

    return res.json(cfg);

  } catch (err) {
    console.error("Erro ao salvar débito automático:", err);
    return res.status(500).json({ error: "Erro ao salvar débito automático" });
  }
});




// ====== START ======
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
