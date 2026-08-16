import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { Book, UserProfile } from "./src/types.ts";

const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const LOCAL_DB_PATH = path.join(process.cwd(), "local_db.json");

// Certificar diretório de uploads local
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let isSupabaseOnline = false;
let hasCheckedSupabase = false;

async function checkSupabaseAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseUrl) {
    isSupabaseOnline = false;
    hasCheckedSupabase = true;
    return false;
  }
  if (hasCheckedSupabase) {
    return isSupabaseOnline;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const cleanUrl = supabaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: supabaseAnonKey || "" },
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timer);
    if (res && (res.status === 200 || res.status === 401 || res.status === 403 || res.status === 404)) {
      isSupabaseOnline = true;
    } else {
      isSupabaseOnline = false;
      console.warn(`[SUPABASE] Endpoint ${supabaseUrl} inacessível (DNS/offline). Usando armazenamento local de alto desempenho.`);
    }
  } catch {
    isSupabaseOnline = false;
    console.warn(`[SUPABASE] Falha ao resolver ${supabaseUrl}. Usando armazenamento local de alto desempenho.`);
  }
  hasCheckedSupabase = true;
  return isSupabaseOnline;
}

function handleSupabaseError(err: any) {
  if (err?.message?.includes("ENOTFOUND") || err?.message?.includes("fetch failed") || err?.cause?.code === "ENOTFOUND") {
    isSupabaseOnline = false;
  }
}

// Inicializar clientes Supabase se configurado
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
const supabaseAdmin = (isSupabaseConfigured && supabaseServiceRoleKey) 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Banco de Dados Local Fallback
const DEFAULT_BOOKS: Book[] = [
  {
    id: "1",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    year: 1899,
    genre: "Romance / Realismo",
    cover_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    file_url: "/uploads/mock-dom-casmurro.epub",
    created_at: new Date().toISOString()
  },
  {
    id: "2",
    title: "O Cortiço",
    author: "Aluísio Azevedo",
    year: 1890,
    genre: "Naturalismo",
    cover_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    file_url: "/uploads/mock-o-cortico.epub",
    created_at: new Date().toISOString()
  },
  {
    id: "3",
    title: "Memórias Póstumas de Brás Cubas",
    author: "Machado de Assis",
    year: 1881,
    genre: "Romance / Realismo",
    cover_url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80",
    file_url: "/uploads/mock-memorias-postumas.epub",
    created_at: new Date().toISOString()
  },
  {
    id: "4",
    title: "Orgulho e Preconceito",
    author: "Jane Austen",
    year: 1813,
    genre: "Clássico",
    cover_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
    file_url: "/uploads/mock-orgulho-preconceito.epub",
    created_at: new Date().toISOString()
  }
];

// Seed de arquivos epub fictícios locais para garantir que download funcione mesmo no modo local
const seedMockEpubs = () => {
  const mockBooks = ["mock-dom-casmurro.epub", "mock-o-cortico.epub", "mock-memorias-postumas.epub", "mock-orgulho-preconceito.epub"];
  mockBooks.forEach(filename => {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      // Criar um epub mock simples em texto
      fs.writeFileSync(filePath, `EPUB Document Content for ${filename.replace('mock-', '').replace('.epub', '').replace('-', ' ').toUpperCase()}\nEste é um livro fictício gerado eletronicamente para fins de demonstração.`);
    }
  });
};
seedMockEpubs();

interface LocalDatabase {
  books: Book[];
  users: UserProfile[];
  passwords: Record<string, string>; // userId -> password plain-text for simple local demo
}

function loadLocalDB(): LocalDatabase {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
      if (data.books && data.users && data.passwords) {
        let changed = false;
        
        // Remover qualquer usuário fantasma sem email válido
        const prevCount = data.users.length;
        data.users = data.users.filter((u: any) => {
          const hasValidEmail = u && u.email && typeof u.email === "string" && u.email.trim().length > 0 && u.email.includes("@");
          if (!hasValidEmail) {
            if (u && u.id && data.passwords[u.id]) {
              delete data.passwords[u.id];
            }
            return false;
          }
          return true;
        });
        if (data.users.length !== prevCount) {
          changed = true;
        }

        data.users.forEach((u: UserProfile) => {
          if (u.email?.toLowerCase() === "lfalvespe@gmail.com") {
            if (u.role !== "admin") {
              u.role = "admin";
              changed = true;
            }
          } else {
            if (u.role !== "user") {
              u.role = "user";
              changed = true;
            }
          }
        });
        if (changed) {
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
        }
        return data;
      }
    } catch (e) {
      console.error("Erro ao carregar banco local, recriando...", e);
    }
  }

  // Seed inicial
  const initialDB: LocalDatabase = {
    books: [],
    users: [
      {
        id: "admin-id",
        email: "admin@livraria.com",
        role: "user",
        status: "active",
        created_at: new Date().toISOString()
      },
      {
        id: "user-id",
        email: "usuario@livraria.com",
        role: "user",
        status: "active",
        created_at: new Date().toISOString()
      },
      {
        id: "lfalvespe-admin-id",
        email: "lfalvespe@gmail.com",
        role: "admin",
        status: "active",
        must_change_password: true,
        created_at: new Date().toISOString()
      }
    ],
    passwords: {
      "admin-id": "admin123",
      "user-id": "user123",
      "lfalvespe-admin-id": "12345678"
    }
  };
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialDB, null, 2));
  return initialDB;
}

function isValidUUID(str?: string | null): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function saveLocalDB(db: LocalDatabase) {
  // Garantir que nenhum usuário sem email válido seja salvo
  db.users = db.users.filter((u: any) => u && u.email && typeof u.email === "string" && u.email.trim().length > 0 && u.email.includes("@"));
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
}

async function ensureUserExistsLocal(db: LocalDatabase, id: string): Promise<UserProfile | undefined> {
  let user = db.users.find(u => u.id === id);
  if (!user && isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
    try {
      const clientToUse = supabaseAdmin || supabase;
      const { data: sbProfile } = await clientToUse
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      let meta: any = {};
      let authEmail = "";
      if (supabaseAdmin && isValidUUID(id)) {
        try {
          const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(id);
          if (!authUserErr && authUserData?.user) {
            meta = authUserData.user.user_metadata || {};
            authEmail = authUserData.user.email || "";
          }
        } catch {
          // Ignorado silenciosamente
        }
      }

      const emailValue = ((sbProfile ? sbProfile.email : null) || authEmail || meta.email || "").trim();

      // Se não houver email válido, não criar e não registrar este usuário fantasma
      if (!emailValue || !emailValue.includes("@")) {
        return undefined;
      }

      if (sbProfile || meta || authEmail) {
        const nameValue = meta.name || (sbProfile ? sbProfile.name : "") || "";
        const avatarValue = meta.avatar || (sbProfile ? sbProfile.avatar : "") || "";
        const statusMessageValue = meta.status_message || (sbProfile ? sbProfile.status_message : "") || "";
        const favoritesValue = meta.favorites || (sbProfile ? sbProfile.favorites : []) || [];
        const readBooksValue = meta.read_books || (sbProfile ? sbProfile.read_books : []) || [];
        const annotationsValue = meta.annotations || (sbProfile ? sbProfile.annotations : {}) || {};
        const roleValue = (sbProfile ? sbProfile.role : null) || meta.role || "user";
        const statusValue = (sbProfile ? sbProfile.status : null) || "active";

        user = {
          id,
          email: emailValue,
          role: roleValue as "admin" | "user",
          status: statusValue as "active" | "banned",
          name: nameValue,
          avatar: avatarValue,
          status_message: statusMessageValue,
          favorites: favoritesValue,
          read_books: readBooksValue,
          annotations: annotationsValue,
          must_change_password: sbProfile ? sbProfile.must_change_password : false,
          created_at: (sbProfile ? sbProfile.created_at : null) || new Date().toISOString()
        };
        db.users.push(user);
        saveLocalDB(db);
      }
    } catch (err: any) {
      handleSupabaseError(err);
      // Ignorado silenciosamente para contingência local
    }
  }
  return user;
}

// Helper para validar privilégios de administrador de forma centralizada e segura
async function isRequestAdmin(req: express.Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const callerId = authHeader.split(" ")[1]?.trim();
  if (!callerId) return false;

  // 1. Verificar no Supabase
  if (isSupabaseConfigured && isSupabaseOnline && supabase) {
    try {
      const clientToUse = supabaseAdmin || supabase;
      const { data: profile } = await clientToUse
        .from("user_profiles")
        .select("role, email, status")
        .eq("id", callerId)
        .maybeSingle();

      if (profile) {
        if (profile.status === "banned") return false;
        if (profile.role === "admin" || profile.email?.toLowerCase() === "lfalvespe@gmail.com") {
          return true;
        }
      }

      if (supabaseAdmin && isValidUUID(callerId)) {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(callerId);
        if (authUserData?.user) {
          const userEmail = authUserData.user.email?.toLowerCase();
          const userRole = authUserData.user.user_metadata?.role;
          if (userEmail === "lfalvespe@gmail.com" || userRole === "admin") {
            return true;
          }
        }
      }
    } catch (err: any) {
      handleSupabaseError(err);
    }
  }

  // 2. Verificar no Banco Local
  const db = loadLocalDB();
  const user = db.users.find(u => u.id === callerId);
  if (user) {
    if (user.status === "banned") return false;
    if (user.role === "admin" || user.email?.toLowerCase() === "lfalvespe@gmail.com") {
      return true;
    }
  }

  return false;
}

async function saveUserMetadataToSupabase(id: string, user: any) {
  if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin && isValidUUID(id)) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          name: user.name || "",
          avatar: user.avatar || "",
          status_message: user.status_message || "",
          favorites: user.favorites || [],
          read_books: user.read_books || [],
          annotations: user.annotations || {}
        }
      });
      console.log(`[SUPABASE BACKUP] Metadados salvos persistente para o usuário ${id}`);
    } catch (err: any) {
      handleSupabaseError(err);
      console.warn(`Aviso ao salvar metadados do usuário ${id} no Supabase:`, err.message || err);
    }
  }
}

async function startServer() {
  const app = express();

  // Testar se o endpoint do Supabase está acessível e online
  await checkSupabaseAvailable();

  // Middleware para suportar uploads grandes de capase ebooks em base64
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Servir uploads locais de mídia/arquivos
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Garantir que lfalvespe@gmail.com tenha papel de admin no Supabase e os demais tenham role 'user', e limpar contas sem email
  if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin) {
    try {
      // 0. Limpar registros fantasmas sem email da tabela customizada e auth
      try {
        await supabaseAdmin.from("user_profiles").delete().or("email.is.null,email.eq.''");
        const { data: allAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
        if (allAuthUsers?.users) {
          for (const u of allAuthUsers.users) {
            if (!u.email || !u.email.includes("@")) {
              await supabaseAdmin.auth.admin.deleteUser(u.id);
              console.log(`[CLEANUP] Usuário fantasma sem email excluído do Supabase: ${u.id}`);
            }
          }
        }
      } catch (cleanErr: any) {
        console.warn("Aviso ao limpar contas fantasmas no Supabase:", cleanErr?.message || cleanErr);
      }

      // 1. Atualiza lfalvespe@gmail.com para admin
      const { data: sbAdminUsers } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, role")
        .eq("email", "lfalvespe@gmail.com");

      if (sbAdminUsers && sbAdminUsers.length > 0) {
        for (const u of sbAdminUsers) {
          if (u.role !== "admin") {
            await supabaseAdmin.from("user_profiles").update({ role: "admin" }).eq("id", u.id);
            if (isValidUUID(u.id)) {
              await supabaseAdmin.auth.admin.updateUserById(u.id, { user_metadata: { role: "admin" } });
            }
            console.log(`[INIT] Papel de ${u.email} atualizado para admin no Supabase.`);
          }
        }
      }

      // 2. Atualiza todos os demais usuários para role 'user'
      const { data: otherUsers } = await supabaseAdmin
        .from("user_profiles")
        .select("id, email, role")
        .neq("email", "lfalvespe@gmail.com");

      if (otherUsers && otherUsers.length > 0) {
        for (const u of otherUsers) {
          if (u.role !== "user") {
            await supabaseAdmin.from("user_profiles").update({ role: "user" }).eq("id", u.id);
            if (isValidUUID(u.id)) {
              await supabaseAdmin.auth.admin.updateUserById(u.id, { user_metadata: { role: "user" } });
            }
            console.log(`[INIT] Papel de ${u.email} redefinido para user no Supabase.`);
          }
        }
      }
    } catch (e: any) {
      handleSupabaseError(e);
      console.warn("Aviso ao conectar/sincronizar no Supabase (usando contingência local):", e?.message || e);
    }
  }

  // 3. Inicialização e sincronização de livros:
  // Os 4 livros padrão só devem ser inseridos se não houver NENHUM livro cadastrado no sistema
  if (isSupabaseConfigured && isSupabaseOnline && supabase) {
    try {
      const { data: supabaseBooks, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      const db = loadLocalDB();

      if (!error && supabaseBooks) {
        if (supabaseBooks.length > 0) {
          // Já existem livros no Supabase. O banco local passa a espelhar exatamente o Supabase
          db.books = supabaseBooks;
          saveLocalDB(db);
          console.log(`[INIT] ${supabaseBooks.length} livro(s) encontrados no Supabase. Banco local sincronizado.`);
        } else {
          // Supabase tem 0 livros. Se o banco local também tiver 0 livros, insere os 4 livros padrão como seed inicial
          if (!db.books || db.books.length === 0) {
            console.log("[INIT] Nenhum livro cadastrado no sistema (Supabase e local vazios). Inserindo os 4 livros padrão...");
            const clientToUse = supabaseAdmin || supabase;
            try {
              const { data: inserted } = await clientToUse
                .from("books")
                .insert(DEFAULT_BOOKS)
                .select();
              if (inserted && inserted.length > 0) {
                db.books = inserted;
              } else {
                db.books = [...DEFAULT_BOOKS];
              }
            } catch {
              db.books = [...DEFAULT_BOOKS];
            }
            saveLocalDB(db);
          } else {
            console.log(`[INIT] Supabase com 0 livros, mantendo os ${db.books.length} livro(s) existentes do banco local.`);
          }
        }
      }
    } catch (bookErr: any) {
      handleSupabaseError(bookErr);
      console.warn("Aviso ao verificar livros no Supabase na inicialização:", bookErr?.message || bookErr);
    }
  } else {
    const db = loadLocalDB();
    if (!db.books || db.books.length === 0) {
      console.log("[INIT] Nenhum livro cadastrado no banco local. Inserindo os 4 livros padrão iniciais...");
      db.books = [...DEFAULT_BOOKS];
      saveLocalDB(db);
    }
  }

  // --- API ROUTES ---

  // Retorna status de configuração do backend
  app.get("/api/config-status", (req, res) => {
    res.json({
      isConfigured: isSupabaseConfigured && isSupabaseOnline,
      supabaseUrlExists: Boolean(supabaseUrl),
      supabaseAnonKeyExists: Boolean(supabaseAnonKey),
      supabaseServiceRoleKeyExists: Boolean(supabaseServiceRoleKey),
      isOnline: isSupabaseOnline
    });
  });

  // Autenticação - Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    // Função de verificação local para usar como fallback
    const loginLocal = () => {
      const db = loadLocalDB();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { error: "Email não cadastrado.", status: 401 };
      }

      if (db.passwords[user.id] !== password) {
        return { error: "Senha incorreta.", status: 401 };
      }

      if (user.status === "banned") {
        return { error: "Sua conta foi banida.", status: 430 };
      }

      return {
        user,
        session: { access_token: `local-token-${user.id}`, expires_at: Date.now() + 3600000 }
      };
    };

    if (isSupabaseConfigured && isSupabaseOnline && supabase) {
      try {
        // Tentar autenticar com o Supabase Auth Client
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          // Se falhou no Supabase, tenta logar localmente antes de desistir
          console.log(`Supabase login falhou para ${email}: ${error.message}. Tentando login local fallback...`);
          const localResult = loginLocal();
          if ("error" in localResult) {
            return res.status(401).json({ error: error.message });
          }
          return res.json(localResult);
        }

        const authUser = data.user;
        if (!authUser) {
          const localResult = loginLocal();
          if ("error" in localResult) {
            return res.status(500).json({ error: "Erro desconhecido na autenticação." });
          }
          return res.json(localResult);
        }

        // Buscar perfil para verificar papel (role) e bloqueios
        const clientToUse = supabaseAdmin || supabase;
        const { data: profile, error: profileErr } = await clientToUse
          .from("user_profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        let meta: any = {};
        if (supabaseAdmin) {
          try {
            const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(authUser.id);
            if (!authUserErr && authUserData?.user) {
              meta = authUserData.user.user_metadata || {};
            }
          } catch (metaErr) {
            console.warn("Erro ao ler metadados no login:", metaErr);
          }
        } else {
          meta = authUser.user_metadata || {};
        }

        const nameValue = meta.name || (profile ? profile.name : "") || "";
        const avatarValue = meta.avatar || (profile ? profile.avatar : "") || "";
        const statusMessageValue = meta.status_message || (profile ? profile.status_message : "") || "";
        const favoritesValue = meta.favorites || (profile ? profile.favorites : []) || [];
        const readBooksValue = meta.read_books || (profile ? profile.read_books : []) || [];
        const annotationsValue = meta.annotations || (profile ? profile.annotations : {}) || {};

        let profileRole = (profile?.role as "admin" | "user") || meta.role || "user";
        if ((authUser.email || email).toLowerCase() === "lfalvespe@gmail.com") {
          profileRole = "admin";
        }

        let profileData: UserProfile = {
          id: authUser.id,
          email: authUser.email || email,
          role: profileRole,
          status: (profile?.status as "active" | "banned") || "active",
          name: nameValue,
          avatar: avatarValue,
          status_message: statusMessageValue,
          favorites: favoritesValue,
          read_books: readBooksValue,
          annotations: annotationsValue,
          created_at: profile?.created_at || authUser.created_at || new Date().toISOString(),
          must_change_password: profile ? profile.must_change_password : false
        };

        if (profileErr) {
          console.error("Erro ao carregar perfil do Supabase no login:", profileErr);
        } else if (!profile) {
          // Se não existir perfil configurado na tabela (devido à falta de trigger), cria um perfil de usuário padrão (apenas se realmente não existir)
          console.log(`Perfil da tabela user_profiles não encontrado para ${authUser.id}. Criando...`);
          const newProfile = { 
            id: authUser.id, 
            email: authUser.email || email, 
            role: "user", 
            status: "active" 
          };
          try {
            // Usar insert em vez de upsert para evitar sobrescrever acidentalmente dados existentes
            await clientToUse.from("user_profiles").insert([newProfile]);
          } catch (insErr) {
            console.warn("Aviso ao inserir novo perfil:", insErr);
          }
        }

        if (profileData.status === "banned") {
          return res.status(403).json({ error: "Sua conta foi banida. Entre em contato com o administrador." });
        }

        // Sincronizar com o banco de dados local para persistência em memória/disco
        const db = loadLocalDB();
        let localUser = db.users.find(u => u.id === authUser.id);
        if (localUser) {
          Object.assign(localUser, profileData);
        } else {
          db.users.push(profileData);
        }
        saveLocalDB(db);

        return res.json({
          user: profileData,
          session: data.session
        });

      } catch (err: any) {
        handleSupabaseError(err);
        console.log(`Supabase login gerou exceção para ${email}. Tentando login local fallback...`);
        const localResult = loginLocal();
        if ("error" in localResult) {
          return res.status(500).json({ error: err.message });
        }
        return res.json(localResult);
      }
    } else {
      // Login Local Mock
      const localResult = loginLocal();
      if ("error" in localResult) {
        return res.status(localResult.status || 401).json({ error: localResult.error });
      }
      return res.json(localResult);
    }
  });

  // Autenticação - Cadastro (Registro)
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, role } = req.body; // se o primeiro admin se cadastrar, permitimos especificar role

    const isCallerAdmin = await isRequestAdmin(req);
    console.log("[REGISTER DEBUG] Received request to register:", email, "with requested role:", role, "isCallerAdmin:", isCallerAdmin);

    // Apenas admins podem criar novas contas com a role 'admin'. Se for self-service, forçamos 'user'.
    const desiredRole = (role === "admin" && isCallerAdmin) ? "admin" : "user";
    
    // Se a conta for cadastrada por um admin (ex: senha inicial/temporária criada pelo painel), obrigamos trocar
    const mustChangePassword = isCallerAdmin;

    console.log("[REGISTER DEBUG] Desired Role:", desiredRole, "| mustChangePassword:", mustChangePassword);

    if (!email || !password) {
      return res.status(400).json({ error: "Preencha o campo de email e senha." });
    }

    if (isSupabaseConfigured && isSupabaseOnline && supabase) {
      try {
        let authUser;
        let authId = "";

        // Se o adminClient (Service Role Key) estiver disponível, criamos diretamente para burlar verificação de email
        if (supabaseAdmin) {
          console.log("[REGISTER DEBUG] Creating user using Supabase Admin Auth API...");
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              role: desiredRole
            }
          });

          if (error) {
            console.error("[REGISTER DEBUG] Error creating auth user via admin API:", error);
            return res.status(400).json({ error: error.message });
          }
          authUser = data.user;
          authId = data.user.id;
        } else {
          console.log("[REGISTER DEBUG] Creating user using standard Supabase Auth SignUp API...");
          // Signup padrão normal (pode requerer ativação por email dependendo das configurações do Supabase)
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role: desiredRole
              }
            }
          });

          if (error) {
            console.error("[REGISTER DEBUG] Error creating auth user via signUp API:", error);
            return res.status(400).json({ error: error.message });
          }
          authUser = data.user;
          if (data.user) authId = data.user.id;
        }

        if (!authId) {
          return res.status(400).json({ error: "Não foi possível criar o usuário no catálogo do Supabase." });
        }

        console.log("[REGISTER DEBUG] Auth User created successfully. ID:", authId);

        // Criar ou atualizar de forma resiliente o registro na tabela de user_profiles
        const clientToUseForReg = supabaseAdmin || supabase;
        
        // Verificar se já existe um registro correspondente (de triggers ou execuções paralelas)
        console.log("[REGISTER DEBUG] Checking if user profile already exists for ID:", authId);
        const { data: existingProfile, error: checkErr } = await clientToUseForReg
          .from("user_profiles")
          .select("id")
          .eq("id", authId)
          .maybeSingle();

        if (checkErr) {
          console.error("[REGISTER DEBUG] Error checking for existing profile:", checkErr);
        }

        let profileErr = null;
        if (existingProfile) {
          console.log("[REGISTER DEBUG] Profile already exists. Performing an UPDATE to role:", desiredRole);
          // Atualiza o registro existente de forma explícita
          const { error: updateErr } = await clientToUseForReg
            .from("user_profiles")
            .update({
              role: desiredRole,
              status: "active",
              must_change_password: mustChangePassword
            })
            .eq("id", authId);

          if (updateErr && (updateErr.code === "PGRST204" || updateErr.message?.includes("must_change_password"))) {
            console.log("[REGISTER DEBUG] PGRST204 column missing error, retrying update without must_change_password...");
            const { error: retryUpdateErr } = await clientToUseForReg
              .from("user_profiles")
              .update({
                role: desiredRole,
                status: "active"
              })
              .eq("id", authId);
            profileErr = retryUpdateErr;
          } else {
            profileErr = updateErr;
          }
        } else {
          console.log("[REGISTER DEBUG] Profile does not exist. Performing an INSERT with role:", desiredRole);
          // Insere um novo registro
          const { error: insertErr } = await clientToUseForReg
            .from("user_profiles")
            .insert([{
              id: authId,
              email,
              role: desiredRole,
              status: "active",
              must_change_password: mustChangePassword
            }]);

          if (insertErr && (insertErr.code === "PGRST204" || insertErr.message?.includes("must_change_password"))) {
            console.log("[REGISTER DEBUG] PGRST204 column missing error, retrying insert without must_change_password...");
            const { error: retryInsertErr } = await clientToUseForReg
              .from("user_profiles")
              .insert([{
                id: authId,
                email,
                role: desiredRole,
                status: "active"
              }]);
            profileErr = retryInsertErr;
          } else {
            profileErr = insertErr;
          }
        }

        if (profileErr) {
          console.error("[REGISTER DEBUG] Error in profile upsert:", profileErr);
          console.error("Aviso: perfil não pôde ser inserido/atualizado na tabela de perfis:", profileErr.message);
        } else {
          console.log("[REGISTER DEBUG] Profile upserted successfully in database!");
        }

        return res.json({
          success: true,
          user: {
            id: authId,
            email,
            role: desiredRole,
            status: "active",
            must_change_password: mustChangePassword
          },
          message: supabaseAdmin ? "Conta criada e confirmada com sucesso!" : "Conta criada com sucesso! Verifique seu email caso esteja habilitado no painel do Supabase."
        });

      } catch (err: any) {
        handleSupabaseError(err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Cadastro local
      const db = loadLocalDB();
      const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());

      if (exists) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado." });
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        role: desiredRole,
        status: "active",
        must_change_password: mustChangePassword,
        created_at: new Date().toISOString()
      };

      db.users.push(newUser);
      db.passwords[newUser.id] = password;

      saveLocalDB(db);

      return res.json({
        success: true,
        user: newUser,
        message: "Conta de demonstração criada com sucesso no catálogo local!"
      });
    }
  });

  // Trocar senha no primeiro acesso obrigatório
  app.post("/api/auth/change-password-first-access", async (req, res) => {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres." });
    }

    const isUUID = isValidUUID(userId);

    if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin && isUUID) {
      try {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword
        });
        if (authErr) {
          return res.status(400).json({ error: authErr.message });
        }

        const { error: profileErr } = await supabaseAdmin
          .from("user_profiles")
          .update({ must_change_password: false })
          .eq("id", userId);

        if (profileErr) {
          if (profileErr.code === "PGRST204" || profileErr.message?.includes("must_change_password")) {
            console.log("[PASSWORD RESET DEBUG] must_change_password column is missing in Database, ignoring profile update.");
          } else {
            console.warn("Aviso: perfil não pôde ser atualizado no Supabase", profileErr);
          }
        }

        // Recuperar perfil atualizado
        const { data: updatedProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        return res.json({
          success: true,
          user: updatedProfile || { id: userId, email: "", role: "admin", status: "active", must_change_password: false }
        });
      } catch (err: any) {
        handleSupabaseError(err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Banco de Dados Local Fallback
      const db = loadLocalDB();
      const user = db.users.find(u => u.id === userId);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      db.passwords[userId] = newPassword;
      user.must_change_password = false;
      
      saveLocalDB(db);

      return res.json({
        success: true,
        user
      });
    }
  });

  // Obter Lista de Livros
  app.get("/api/books", async (req, res) => {
    const db = loadLocalDB();

    if (isSupabaseConfigured && isSupabaseOnline && supabase) {
      try {
        const { data: supabaseBooks, error } = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Erro ao ler livros do Supabase. Usando banco local de contingência:", error);
          if (!db.books || db.books.length === 0) {
            db.books = [...DEFAULT_BOOKS];
            saveLocalDB(db);
          }
          return res.json(db.books);
        }

        if (supabaseBooks && supabaseBooks.length > 0) {
          // Supabase tem livros: é a fonte da verdade
          db.books = supabaseBooks;
          saveLocalDB(db);
          return res.json(supabaseBooks);
        } else {
          // Supabase tem 0 livros.
          // Se o banco local também tiver 0 livros, insere os 4 livros padrão como seed inicial
          if (!db.books || db.books.length === 0) {
            console.log("[GET /api/books] Nenhum livro cadastrado. Inserindo os 4 livros padrão...");
            const clientToUse = supabaseAdmin || supabase;
            try {
              const { data: inserted } = await clientToUse
                .from("books")
                .insert(DEFAULT_BOOKS)
                .select();
              if (inserted && inserted.length > 0) {
                db.books = inserted;
                saveLocalDB(db);
                return res.json(inserted);
              }
            } catch {}
            db.books = [...DEFAULT_BOOKS];
            saveLocalDB(db);
            return res.json(db.books);
          }
          return res.json(db.books);
        }
      } catch (err: any) {
        handleSupabaseError(err);
        console.warn("Exceção técnica ao buscar livros do Supabase. Usando banco local de contingência:", err);
        if (!db.books || db.books.length === 0) {
          db.books = [...DEFAULT_BOOKS];
          saveLocalDB(db);
        }
        return res.json(db.books);
      }
    } else {
      if (!db.books || db.books.length === 0) {
        db.books = [...DEFAULT_BOOKS];
        saveLocalDB(db);
      }
      return res.json(db.books);
    }
  });

  // Cadastrar Novo Livro + Upload via Base64 (Apenas Admin)
  app.post("/api/books", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { title, author, year, genre, synopsis, cover_base64, cover_filename, epub_base64, epub_filename } = req.body;

    if (!title || !author || !year || !genre || !synopsis) {
      return res.status(400).json({ error: "Título, Autor, Ano, Gênero e Sinopse são campos obrigatórios." });
    }

    try {
      let finalCoverUrl = "";
      let finalFileUrl = "";
      const warnings: string[] = [];

      // 1. Processar Upload da Capa (Imagem)
      if (cover_base64 && cover_filename) {
        const coverBuffer = Buffer.from(cover_base64.split(",")[1] || cover_base64, "base64");
        const uniqueCoverName = `cover-${Date.now()}-${cover_filename.replace(/\s+/g, "_")}`;

        if (isSupabaseConfigured && isSupabaseOnline && supabase) {
          try {
            const clientToUse = supabaseAdmin || supabase;
            // Upload para o bucket customizado 'books' no Supabase Storage
            const { error: uploadErr } = await clientToUse.storage
              .from("books")
              .upload(`covers/${uniqueCoverName}`, coverBuffer, {
                contentType: "image/jpeg",
                upsert: true
              });

            if (uploadErr) {
              console.warn("Erro ao subir capa no Supabase, tentando fallback local:", uploadErr.message);
              warnings.push(`Capa salva localmente (erro no storage Supabase: ${uploadErr.message})`);
              // Fallback Local
              const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
              fs.writeFileSync(filePath, coverBuffer);
              finalCoverUrl = `/uploads/${uniqueCoverName}`;
            } else {
              const { data: { publicUrl } } = clientToUse.storage
                .from("books")
                .getPublicUrl(`covers/${uniqueCoverName}`);
              finalCoverUrl = publicUrl;
            }
          } catch (storageErr: any) {
            handleSupabaseError(storageErr);
            console.warn("Exceção técnica no upload de capa Supabase, fallback local:", storageErr.message);
            warnings.push(`Capa salva localmente (exceção no storage: ${storageErr.message})`);
            const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
            fs.writeFileSync(filePath, coverBuffer);
            finalCoverUrl = `/uploads/${uniqueCoverName}`;
          }
        } else {
          // Upload Local
          const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
          fs.writeFileSync(filePath, coverBuffer);
          finalCoverUrl = `/uploads/${uniqueCoverName}`;
        }
      } else {
        // Capa padrão se não informada
        finalCoverUrl = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80";
      }

      // 2. Processar Upload do EPUB
      if (epub_base64 && epub_filename) {
        const epubBuffer = Buffer.from(epub_base64.split(",")[1] || epub_base64, "base64");
        const uniqueEpubName = `ebook-${Date.now()}-${epub_filename.replace(/\s+/g, "_")}`;

        if (isSupabaseConfigured && isSupabaseOnline && supabase) {
          try {
            const clientToUse = supabaseAdmin || supabase;
            // Upload para o bucket 'books' no Supabase Storage
            const { error: uploadErr } = await clientToUse.storage
              .from("books")
              .upload(`epubs/${uniqueEpubName}`, epubBuffer, {
                contentType: "application/epub+zip",
                upsert: true
              });

            if (uploadErr) {
              console.warn("Erro ao subir EPUB no Supabase, tentando fallback local:", uploadErr.message);
              warnings.push(`EPUB salvo localmente (erro no storage Supabase: ${uploadErr.message})`);
              // Fallback Local
              const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
              fs.writeFileSync(filePath, epubBuffer);
              finalFileUrl = `/uploads/${uniqueEpubName}`;
            } else {
              const { data: { publicUrl } } = clientToUse.storage
                .from("books")
                .getPublicUrl(`epubs/${uniqueEpubName}`);
              finalFileUrl = publicUrl;
            }
          } catch (storageErr: any) {
            handleSupabaseError(storageErr);
            console.warn("Exceção técnica no upload de EPUB Supabase, fallback local:", storageErr.message);
            warnings.push(`EPUB salvo localmente (exceção no storage: ${storageErr.message})`);
            const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
            fs.writeFileSync(filePath, epubBuffer);
            finalFileUrl = `/uploads/${uniqueEpubName}`;
          }
        } else {
          // Upload Local
          const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
          fs.writeFileSync(filePath, epubBuffer);
          finalFileUrl = `/uploads/${uniqueEpubName}`;
        }
      } else {
        return res.status(400).json({ error: "O arquivo EPUB é obrigatório." });
      }

      // 3. Cadastrar Livro no Banco de Dados
      const newBook: Book = {
        id: `book-${Date.now()}`,
        title,
        author,
        year: parseInt(year),
        genre,
        synopsis,
        cover_url: finalCoverUrl,
        file_url: finalFileUrl,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && isSupabaseOnline && supabase) {
        try {
          const clientToUse = supabaseAdmin || supabase;
          const { data, error } = await clientToUse
            .from("books")
            .insert([{
              title,
              author,
              year: parseInt(year),
              genre,
              synopsis,
              cover_url: finalCoverUrl,
              file_url: finalFileUrl,
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (error) {
            console.warn("Erro ao cadastrar livro no Supabase. Detalhes completos:", error);
            const clientType = supabaseAdmin ? "Admin (Service Role)" : "Anon Client";
            const detailStr = `Erro original do Supabase -> Mensagem: "${error.message}" | Detalhes: "${error.details || 'Nenhum'}" | Dica: "${error.hint || 'Nenhuma'}" | Código SQL: "${error.code || 'N/A'}" | Cliente: "${clientType}"`;
            warnings.push(`Salvo localmente para contingência (${detailStr})`);

            // Salva no banco de dados local para manter o app totalmente operacional!
            const db = loadLocalDB();
            db.books.unshift(newBook);
            saveLocalDB(db);
            return res.json({ 
              success: true, 
              book: newBook,
              warning: warnings.join(" ; ")
            });
          }
          
          // Se deu certo no Supabase, também salva localmente para manter coerência
          const db = loadLocalDB();
          db.books.unshift(data);
          saveLocalDB(db);
          return res.json({ 
            success: true, 
            book: data,
            warning: warnings.length > 0 ? warnings.join(" ; ") : undefined
          });
        } catch (dbErr: any) {
          handleSupabaseError(dbErr);
          console.warn("Exceção ao inserir no Supabase. Salvando localmente:", dbErr.message);
          warnings.push(`Salvo localmente para contingência por exceção técnica: ${dbErr.message}`);
          const db = loadLocalDB();
          db.books.unshift(newBook);
          saveLocalDB(db);
          return res.json({ 
            success: true, 
            book: newBook,
            warning: warnings.join(" ; ")
          });
        }
      } else {
        const db = loadLocalDB();
        db.books.unshift(newBook);
        saveLocalDB(db);
        return res.json({ success: true, book: newBook });
      }

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erro interno ao processar cadastro do livro." });
    }
  });

  // Editar Livro existente (Apenas Admin)
  app.put("/api/books/:id", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;
    const { title, author, year, genre, synopsis, cover_url, file_url, cover_base64, cover_filename, epub_base64, epub_filename } = req.body;

    if (!title || !author || !year || !genre || !synopsis) {
      return res.status(400).json({ error: "Título, Autor, Ano, Gênero e Sinopse são campos obrigatórios." });
    }

    try {
      let finalCoverUrl = cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80";
      let finalFileUrl = file_url || "";
      const warnings: string[] = [];

      // 1. Processar Novo Upload da Capa (se informada via base64)
      if (cover_base64 && cover_filename) {
        const coverBuffer = Buffer.from(cover_base64.split(",")[1] || cover_base64, "base64");
        const uniqueCoverName = `cover-${Date.now()}-${cover_filename.replace(/\s+/g, "_")}`;

        if (isSupabaseConfigured && isSupabaseOnline && supabase) {
          try {
            const clientToUse = supabaseAdmin || supabase;
            const { error: uploadErr } = await clientToUse.storage
              .from("books")
              .upload(`covers/${uniqueCoverName}`, coverBuffer, {
                contentType: "image/jpeg",
                upsert: true
              });

            if (uploadErr) {
              console.warn("Erro ao subir capa no Supabase, tentando fallback local:", uploadErr.message);
              warnings.push(`Capa salva localmente (erro no storage Supabase: ${uploadErr.message})`);
              const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
              fs.writeFileSync(filePath, coverBuffer);
              finalCoverUrl = `/uploads/${uniqueCoverName}`;
            } else {
              const { data: { publicUrl } } = clientToUse.storage
                .from("books")
                .getPublicUrl(`covers/${uniqueCoverName}`);
              finalCoverUrl = publicUrl;
            }
          } catch (storageErr: any) {
            handleSupabaseError(storageErr);
            console.warn("Exceção técnica no upload de capa Supabase, fallback local:", storageErr.message);
            warnings.push(`Capa salva localmente (exceção no storage: ${storageErr.message})`);
            const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
            fs.writeFileSync(filePath, coverBuffer);
            finalCoverUrl = `/uploads/${uniqueCoverName}`;
          }
        } else {
          const filePath = path.join(UPLOADS_DIR, uniqueCoverName);
          fs.writeFileSync(filePath, coverBuffer);
          finalCoverUrl = `/uploads/${uniqueCoverName}`;
        }
      }

      // 2. Processar Novo Upload do EPUB (se informado via base64)
      if (epub_base64 && epub_filename) {
        const epubBuffer = Buffer.from(epub_base64.split(",")[1] || epub_base64, "base64");
        const uniqueEpubName = `ebook-${Date.now()}-${epub_filename.replace(/\s+/g, "_")}`;

        if (isSupabaseConfigured && isSupabaseOnline && supabase) {
          try {
            const clientToUse = supabaseAdmin || supabase;
            const { error: uploadErr } = await clientToUse.storage
              .from("books")
              .upload(`epubs/${uniqueEpubName}`, epubBuffer, {
                contentType: "application/epub+zip",
                upsert: true
              });

            if (uploadErr) {
              console.warn("Erro ao subir EPUB no Supabase, tentando fallback local:", uploadErr.message);
              warnings.push(`EPUB salvo localmente (erro no storage Supabase: ${uploadErr.message})`);
              const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
              fs.writeFileSync(filePath, epubBuffer);
              finalFileUrl = `/uploads/${uniqueEpubName}`;
            } else {
              const { data: { publicUrl } } = clientToUse.storage
                .from("books")
                .getPublicUrl(`epubs/${uniqueEpubName}`);
              finalFileUrl = publicUrl;
            }
          } catch (storageErr: any) {
            handleSupabaseError(storageErr);
            console.warn("Exceção técnica no upload de EPUB Supabase, fallback local:", storageErr.message);
            warnings.push(`EPUB salvo localmente (exceção no storage: ${storageErr.message})`);
            const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
            fs.writeFileSync(filePath, epubBuffer);
            finalFileUrl = `/uploads/${uniqueEpubName}`;
          }
        } else {
          const filePath = path.join(UPLOADS_DIR, uniqueEpubName);
          fs.writeFileSync(filePath, epubBuffer);
          finalFileUrl = `/uploads/${uniqueEpubName}`;
        }
      }

      // 3. Atualizar Livro no Banco de Dados
      const updatedBookFields: Partial<Book> = {
        title,
        author,
        year: parseInt(year),
        genre,
        synopsis,
        cover_url: finalCoverUrl,
        file_url: finalFileUrl
      };

      if (isSupabaseConfigured && isSupabaseOnline && supabase) {
        try {
          const clientToUse = supabaseAdmin || supabase;
          const { data, error } = await clientToUse
            .from("books")
            .update(updatedBookFields)
            .eq("id", id)
            .select()
            .single();

          if (error) {
            console.warn("Erro ao atualizar livro no Supabase. Atualizando localmente:", error);
            const clientType = supabaseAdmin ? "Admin (Service Role)" : "Anon Client";
            const detailStr = `Erro original do Supabase -> Mensagem: "${error.message}" | Detalhes: "${error.details || 'Nenhum'}" | Código SQL: "${error.code || 'N/A'}" | Cliente: "${clientType}"`;
            warnings.push(`Atualizado localmente para contingência (${detailStr})`);

            // Atualização no local_db.json
            const db = loadLocalDB();
            const idx = db.books.findIndex(b => String(b.id) === String(id));
            if (idx !== -1) {
              db.books[idx] = { ...db.books[idx], ...updatedBookFields };
              saveLocalDB(db);
              return res.json({ success: true, book: db.books[idx], warning: warnings.join(" ; ") });
            } else {
              const newBook = { id, ...updatedBookFields, created_at: new Date().toISOString() } as Book;
              db.books.unshift(newBook);
              saveLocalDB(db);
              return res.json({ success: true, book: newBook, warning: "Livro não existia localmente e foi reinserido como contingência." });
            }
          }

          // Atualizar localmente também para manter coerência
          const db = loadLocalDB();
          const idx = db.books.findIndex(b => String(b.id) === String(id));
          if (idx !== -1) {
            db.books[idx] = { ...db.books[idx], ...data };
          } else {
            db.books.unshift(data);
          }
          saveLocalDB(db);

          return res.json({
            success: true,
            book: data,
            warning: warnings.length > 0 ? warnings.join(" ; ") : undefined
          });
        } catch (dbErr: any) {
          handleSupabaseError(dbErr);
          console.warn("Exceção ao atualizar no Supabase. Salvando localmente:", dbErr.message);
          warnings.push(`Salvo localmente para contingência por exceção técnica: ${dbErr.message}`);
          const db = loadLocalDB();
          const idx = db.books.findIndex(b => String(b.id) === String(id));
          let resultingBook = null;
          if (idx !== -1) {
            db.books[idx] = { ...db.books[idx], ...updatedBookFields };
            resultingBook = db.books[idx];
          } else {
            resultingBook = { id, ...updatedBookFields, created_at: new Date().toISOString() } as Book;
            db.books.unshift(resultingBook);
          }
          saveLocalDB(db);
          return res.json({
            success: true,
            book: resultingBook,
            warning: warnings.join(" ; ")
          });
        }
      } else {
        const db = loadLocalDB();
        const idx = db.books.findIndex(b => String(b.id) === String(id));
        if (idx === -1) {
          return res.status(404).json({ error: "Livro não encontrado." });
        }
        db.books[idx] = { ...db.books[idx], ...updatedBookFields };
        saveLocalDB(db);
        return res.json({ success: true, book: db.books[idx] });
      }
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Erro interno ao atualizar o livro." });
    }
  });

  // Excluir Livro existente (Apenas Admin)
  app.delete("/api/books/:id", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;

    if (isSupabaseConfigured && isSupabaseOnline && supabase) {
      try {
        const clientToUse = supabaseAdmin || supabase;
        const { error } = await clientToUse
          .from("books")
          .delete()
          .eq("id", id);

        if (error) {
          console.warn("Erro ao deletar livro no Supabase. Deletando localmente:", error);
          const db = loadLocalDB();
          const idx = db.books.findIndex(b => String(b.id) === String(id));
          if (idx !== -1) {
            db.books.splice(idx, 1);
            saveLocalDB(db);
          }
          return res.json({ success: true, warning: `Excluído localmente (Erro Supabase: ${error.message})` });
        }

        // Deletar localmente também
        const db = loadLocalDB();
        const idx = db.books.findIndex(b => String(b.id) === String(id));
        if (idx !== -1) {
          db.books.splice(idx, 1);
          saveLocalDB(db);
        }

        return res.json({ success: true });
      } catch (dbErr: any) {
        handleSupabaseError(dbErr);
        console.warn("Exceção ao deletar no Supabase. Removendo localmente:", dbErr.message);
        const db = loadLocalDB();
        const idx = db.books.findIndex(b => String(b.id) === String(id));
        if (idx !== -1) {
          db.books.splice(idx, 1);
          saveLocalDB(db);
        }
        return res.json({ success: true, warning: `Excluído localmente pós exceção técnica: ${dbErr.message}` });
      }
    } else {
      const db = loadLocalDB();
      const idx = db.books.findIndex(b => String(b.id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ error: "Livro não encontrado localmente." });
      }
      db.books.splice(idx, 1);
      saveLocalDB(db);
      return res.json({ success: true });
    }
  });

  // --- GERENCIAMENTO DE CONTAS DA ADMINISTRAÇÃO ---

  // Listar todas as contas (Apenas para Admin)
  app.get("/api/users", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários para listar contas." });
    }

    if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin) {
      try {
        // Obter do Supabase Auth e perfis customizados
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
        if (authErr) {
          console.warn("Erro ao ler usuários Auth do Supabase:", authErr.message);
          const db = loadLocalDB();
          return res.json(db.users.filter(u => u.email && u.email.includes("@")));
        }

        const { data: profiles, error: profileErr } = await supabaseAdmin
          .from("user_profiles")
          .select("*");

        if (profileErr) {
          console.warn("Erro ao buscar perfis no Supabase:", profileErr.message);
          const db = loadLocalDB();
          return res.json(db.users.filter(u => u.email && u.email.includes("@")));
        }

        // Unificar as tabelas, descartando contas sem email válido
        const unifiedUsers = authData.users
          .map(u => {
            const matchedProfile = profiles?.find(p => p.id === u.id);
            const userEmail = (u.email || matchedProfile?.email || "").trim();
            return {
              id: u.id,
              email: userEmail,
              role: matchedProfile?.role || "user",
              status: matchedProfile?.status || "active",
              created_at: u.created_at
            };
          })
          .filter(u => u.email && u.email.length > 0 && u.email.includes("@"));

        return res.json(unifiedUsers);
      } catch (err: any) {
        handleSupabaseError(err);
        console.warn("Exceção na listagem de usuários do Supabase, fallback local:", err.message);
        const db = loadLocalDB();
        return res.json(db.users.filter(u => u.email && u.email.includes("@")));
      }
    } else {
      const db = loadLocalDB();
      return res.json(db.users.filter(u => u.email && u.email.includes("@")));
    }
  });

  // Alterar senha de outro usuário (Apenas Admin)
  app.post("/api/users/:id/change-password", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 4 caracteres." });
    }

    const isUUID = isValidUUID(id);

    if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin && isUUID) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
          password
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true, message: "Senha alterada com sucesso!" });
      } catch (err: any) {
        handleSupabaseError(err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = loadLocalDB();
      const userIndex = db.users.findIndex(u => u.id === id);
      if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado." });

      db.passwords[id] = password;
      saveLocalDB(db);
      return res.json({ success: true, message: "Senha alterada no banco local!" });
    }
  });

  // Banir ou desbanir usuário (Apenas Admin)
  app.post("/api/users/:id/toggle-status", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;
    const { status } = req.body; // 'active' ou 'banned'

    if (status !== "active" && status !== "banned") {
      return res.status(400).json({ error: "Status inválido." });
    }

    const isUUID = isValidUUID(id);

    if (isSupabaseConfigured && isSupabaseOnline && supabase && isUUID) {
      try {
        const clientToUse = supabaseAdmin || supabase;
        const { error } = await clientToUse
          .from("user_profiles")
          .update({ status })
          .eq("id", id);

        if (error) {
          const detail = !supabaseAdmin ? " (Dica: A chave SUPABASE_SERVICE_ROLE_KEY não está ativa nas configurações. O perfil de usuário requer escrita administrativa para atualizar sem passar por restrições de RLS)" : "";
          return res.status(400).json({ error: `${error.message}${detail}` });
        }
        return res.json({ success: true, status });
      } catch (err: any) {
        handleSupabaseError(err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = loadLocalDB();
      const user = db.users.find(u => u.id === id);
      if (!user) return res.status(444).json({ error: "Usuário não encontrado." });

      user.status = status;
      saveLocalDB(db);
      return res.json({ success: true, status });
    }
  });

  // Trocar cargo (role) do usuário (Apenas Admin)
  app.post("/api/users/:id/change-role", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;
    const { role } = req.body; // 'admin' ou 'user'

    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "Cargo inválido." });
    }

    const isUUID = isValidUUID(id);

    if (isSupabaseConfigured && isSupabaseOnline && supabase && isUUID) {
      try {
        const clientToUse = supabaseAdmin || supabase;
        const { error } = await clientToUse
          .from("user_profiles")
          .update({ role })
          .eq("id", id);

        if (error) {
          const detail = !supabaseAdmin ? " (Dica: A chave SUPABASE_SERVICE_ROLE_KEY não está ativa nas configurações. O perfil de usuário requer escrita administrativa para atualizar sem passar por restrições de RLS)" : "";
          return res.status(400).json({ error: `${error.message}${detail}` });
        }
        return res.json({ success: true, role });
      } catch (err: any) {
        handleSupabaseError(err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = loadLocalDB();
      const user = db.users.find(u => u.id === id);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

      user.role = role;
      saveLocalDB(db);
      return res.json({ success: true, role });
    }
  });

  // Excluir usuário (Apenas Admin)
  app.delete("/api/users/:id", async (req, res) => {
    const isAdmin = await isRequestAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso não autorizado: privilégios de administrador necessários." });
    }

    const { id } = req.params;

    // Sempre remover do banco local imediatamente
    const db = loadLocalDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      db.users.splice(userIndex, 1);
    }
    delete db.passwords[id];
    saveLocalDB(db);

    const isUUID = isValidUUID(id);

    if (isSupabaseConfigured && isSupabaseOnline && supabaseAdmin && isUUID) {
      try {
        // 1. Excluir perfil da tabela customizada
        await supabaseAdmin.from("user_profiles").delete().eq("id", id);
        // 2. Excluir da tabela principal do auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) {
          console.warn("Aviso ao excluir usuário no Supabase Auth:", error.message);
        }

        return res.json({ success: true, message: "Usuário excluído com sucesso do Supabase Auth e banco local." });
      } catch (err: any) {
        handleSupabaseError(err);
        return res.json({ success: true, message: "Usuário removido do banco local (Supabase offline/erro)." });
      }
    } else {
      return res.json({ success: true, message: "Usuário excluído com sucesso do banco local." });
    }
  });


  // --- USER PROFILE, FAVORITES AND READ LOGS ---

  // Buscar Perfil do Usuário
  app.get("/api/users/:id/profile", async (req, res) => {
    const { id } = req.params;
    try {
      const db = loadLocalDB();
      
      // Se estiver configurado o Supabase e for um ID UUID válido, buscamos no Supabase
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          const { data: sbProfile } = await clientToUse
            .from("user_profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          let meta: any = {};
          let authEmail = "";
          if (supabaseAdmin && isValidUUID(id)) {
            try {
              const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(id);
              if (!authUserErr && authUserData?.user) {
                meta = authUserData.user.user_metadata || {};
                authEmail = authUserData.user.email || "";
              }
            } catch {
              // Ignorado
            }
          }

          const emailValue = ((sbProfile ? sbProfile.email : null) || authEmail || meta.email || "").trim();

          if (sbProfile || (meta && Object.keys(meta).length > 0) || authEmail) {
            let user = db.users.find(u => u.id === id);
            
            const nameValue = meta.name || (sbProfile ? sbProfile.name : "") || "";
            const avatarValue = meta.avatar || (sbProfile ? sbProfile.avatar : "") || "";
            const statusMessageValue = meta.status_message || (sbProfile ? sbProfile.status_message : "") || "";
            const favoritesValue = meta.favorites || (sbProfile ? sbProfile.favorites : []) || [];
            const readBooksValue = meta.read_books || (sbProfile ? sbProfile.read_books : []) || [];
            const annotationsValue = meta.annotations || (sbProfile ? sbProfile.annotations : {}) || {};
            const roleValue = (sbProfile ? sbProfile.role : null) || meta.role || "user";
            const statusValue = (sbProfile ? sbProfile.status : null) || "active";

            if (user) {
              // Atualizar no banco local com os dados mais recentes do Supabase/Auth Meta
              if (emailValue && emailValue.includes("@")) {
                user.email = emailValue;
              }
              user.name = nameValue;
              user.avatar = avatarValue;
              user.status_message = statusMessageValue;
              user.favorites = favoritesValue;
              user.read_books = readBooksValue;
              user.annotations = annotationsValue;
              user.role = roleValue as "admin" | "user";
              user.status = statusValue as "active" | "banned";
            } else if (emailValue && emailValue.includes("@")) {
              // Só cadastra se tiver um email válido
              user = {
                id,
                email: emailValue,
                role: roleValue as "admin" | "user",
                status: statusValue as "active" | "banned",
                name: nameValue,
                avatar: avatarValue,
                status_message: statusMessageValue,
                favorites: favoritesValue,
                read_books: readBooksValue,
                annotations: annotationsValue,
                must_change_password: sbProfile ? sbProfile.must_change_password : false,
                created_at: (sbProfile ? sbProfile.created_at : null) || new Date().toISOString()
              };
              db.users.push(user);
            }
            saveLocalDB(db);
            if (user) {
              return res.json(user);
            }
          }
        } catch (supabaseErr: any) {
          handleSupabaseError(supabaseErr);
          console.warn("Supabase profile fetch fallback to local:", supabaseErr?.message || supabaseErr);
        }
      }

      const user = db.users.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      return res.json(user);
    } catch (err: any) {
      console.error("Erro ao buscar perfil do usuário:", err);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  // Rota para restaurar/sincronizar dados residuais do cliente (útil após redeploys ou resets de banco local)
  app.post("/api/users/:id/sync-restore", async (req, res) => {
    const { id } = req.params;
    const { email, name, avatar, status_message, favorites, read_books, annotations } = req.body;

    try {
      const db = loadLocalDB();
      let user = await ensureUserExistsLocal(db, id);
      
      if (!user) {
        if (!email || !email.includes("@")) {
          return res.status(400).json({ error: "Email válido obrigatório para sincronização." });
        }
        user = {
          id,
          email: email.trim(),
          role: "user",
          status: "active",
          created_at: new Date().toISOString()
        };
        db.users.push(user);
      }

      if (email && email.includes("@") && !user.email) {
        user.email = email.trim();
      }
      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      if (status_message) user.status_message = status_message;
      if (Array.isArray(favorites)) {
        user.favorites = Array.from(new Set([...(user.favorites || []), ...favorites]));
      }
      if (Array.isArray(read_books)) {
        user.read_books = Array.from(new Set([...(user.read_books || []), ...read_books]));
      }
      if (annotations && typeof annotations === "object") {
        user.annotations = { ...(user.annotations || {}), ...annotations };
      }

      saveLocalDB(db);

      // Também persistimos de forma ultra robusta nos metadados do auth do Supabase
      await saveUserMetadataToSupabase(id, user);

      // Também persistimos na tabela customizada se configurada (ignora erro se colunas não existirem)
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          await clientToUse
            .from("user_profiles")
            .update({
              name: user.name,
              avatar: user.avatar,
              status_message: user.status_message,
              favorites: user.favorites,
              read_books: user.read_books,
              annotations: user.annotations
            })
            .eq("id", id);
        } catch (supabaseErr) {
          handleSupabaseError(supabaseErr);
          console.warn("Supabase backup sync-restore warning (ignorado):", supabaseErr);
        }
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      console.error("Erro na rota de sync-restore:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao sincronizar dados." });
    }
  });

  // Editar Perfil do Usuário (Nome, Avatar upload e Status Message)
  app.put("/api/users/:id/profile", async (req, res) => {
    const { id } = req.params;
    let { name, avatar, status_message } = req.body;

    try {
      // Decodificar e salvar imagem se for base64
      let avatarUrl = avatar;
      if (avatar && avatar.startsWith("data:image/")) {
        // Se estiver usando o Supabase, salvamos o base64 diretamente para ter persistência completa a cada deploy no Render
        if (isSupabaseConfigured && isSupabaseOnline && supabase) {
          avatarUrl = avatar;
        } else {
          const matches = avatar.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, "base64");
            const filename = `profile-${id}-${Date.now()}.${ext}`;
            const filePath = path.join(UPLOADS_DIR, filename);
            fs.writeFileSync(filePath, buffer);
            avatarUrl = `/uploads/${filename}`;
          }
        }
      }

      // Atualizar local database primeiro para termos o objeto completo antes do backup
      const db = loadLocalDB();
      const user = await ensureUserExistsLocal(db, id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      user.name = name;
      user.avatar = avatarUrl;
      user.status_message = status_message;
      saveLocalDB(db);

      // Salvar de forma ultra robusta nos metadados do Auth no Supabase
      await saveUserMetadataToSupabase(id, user);

      // Também tentamos salvar na tabela de perfil customizada (para retrocompatibilidade)
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          await clientToUse
            .from("user_profiles")
            .update({ 
              name, 
              avatar: avatarUrl, 
              status_message 
            })
            .eq("id", id);
        } catch (supabaseErr) {
          handleSupabaseError(supabaseErr);
          console.warn("Supabase profile update warning (ignorado):", supabaseErr);
        }
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao atualizar perfil." });
    }
  });

  // Alternar Favorito
  app.post("/api/users/:id/favorites/toggle", async (req, res) => {
    const { id } = req.params;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "ID do livro é obrigatório." });
    }

    try {
      const db = loadLocalDB();
      const user = await ensureUserExistsLocal(db, id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (!user.favorites) {
        user.favorites = [];
      }

      const idx = user.favorites.indexOf(bookId);
      if (idx === -1) {
        user.favorites.push(bookId);
      } else {
        user.favorites.splice(idx, 1);
      }

      saveLocalDB(db);

      // Salvar nos metadados do auth (Supabase backup persistente)
      await saveUserMetadataToSupabase(id, user);

      // Registrar na tabela de perfil (para retrocompatibilidade, ignora erros se colunas faltarem)
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          await clientToUse
            .from("user_profiles")
            .update({ favorites: user.favorites })
            .eq("id", id);
        } catch (err) {
          handleSupabaseError(err);
          console.warn("Supabase favorites update warning (ignorado):", err);
        }
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao favoritar livro." });
    }
  });

  // Alternar Marcado Como Lido
  app.post("/api/users/:id/read/toggle", async (req, res) => {
    const { id } = req.params;
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "ID do livro é obrigatório." });
    }

    try {
      const db = loadLocalDB();
      const user = await ensureUserExistsLocal(db, id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (!user.read_books) {
        user.read_books = [];
      }

      const idx = user.read_books.indexOf(bookId);
      if (idx === -1) {
        user.read_books.push(bookId);
      } else {
        user.read_books.splice(idx, 1);
      }

      saveLocalDB(db);

      // Salvar nos metadados do auth (Supabase backup persistente)
      await saveUserMetadataToSupabase(id, user);

      // Registrar na tabela de perfil (para retrocompatibilidade, ignora erros se colunas faltarem)
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          await clientToUse
            .from("user_profiles")
            .update({ read_books: user.read_books })
            .eq("id", id);
        } catch (err) {
          handleSupabaseError(err);
          console.warn("Supabase read_books update warning (ignorado):", err);
        }
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao marcar livro como lido." });
    }
  });

  // Adicionar ou Atualizar Anotação para livro favorito
  app.post("/api/users/:id/favorites/annotate", async (req, res) => {
    const { id } = req.params;
    const { bookId, note } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "ID do livro é obrigatório." });
    }

    try {
      const db = loadLocalDB();
      const user = await ensureUserExistsLocal(db, id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (!user.annotations) {
        user.annotations = {};
      }

      user.annotations[bookId] = note || "";
      saveLocalDB(db);

      // Salvar nos metadados do auth (Supabase backup persistente)
      await saveUserMetadataToSupabase(id, user);

      // Registrar na tabela de perfil (para retrocompatibilidade, ignora erros se colunas faltarem)
      if (isSupabaseConfigured && isSupabaseOnline && supabase && isValidUUID(id)) {
        const clientToUse = supabaseAdmin || supabase;
        try {
          await clientToUse
            .from("user_profiles")
            .update({ annotations: user.annotations })
            .eq("id", id);
        } catch (err) {
          handleSupabaseError(err);
          console.warn("Supabase annotations update warning (ignorado):", err);
        }
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao salvar anotação." });
    }
  });


  // --- VITE DEV OR PROD FRONTEND INTEGRATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server rodando em http://localhost:${PORT}`);
    console.log(`Modo Supabase ativo: ${isConfiguredMode(isSupabaseConfigured)}`);
    if (isSupabaseConfigured) {
      console.log(`Supabase Admin (Service Role Key): ${supabaseAdmin ? "Configurada (Ignora RLS com sucesso)" : "Inativa/Ausente (Bypass RLS indisponível!)"}`);
    }
  });
}

function isConfiguredMode(active: boolean) {
  return active ? "Sim (Conectado ao Supabase Real)" : "Não (Fallback em Modo Local Ativo)";
}

startServer().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
});
