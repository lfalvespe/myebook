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
        return data;
      }
    } catch (e) {
      console.error("Erro ao carregar banco local, recriando...", e);
    }
  }

  // Seed inicial
  const initialDB: LocalDatabase = {
    books: DEFAULT_BOOKS,
    users: [
      {
        id: "admin-id",
        email: "admin@livraria.com",
        role: "admin",
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

function saveLocalDB(db: LocalDatabase) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();

  // Middleware para suportar uploads grandes de capase ebooks em base64
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Servir uploads locais de mídia/arquivos
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --- API ROUTES ---

  // Retorna status de configuração do backend
  app.get("/api/config-status", (req, res) => {
    res.json({
      isConfigured: isSupabaseConfigured,
      supabaseUrlExists: Boolean(supabaseUrl),
      supabaseAnonKeyExists: Boolean(supabaseAnonKey),
      supabaseServiceRoleKeyExists: Boolean(supabaseServiceRoleKey)
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

    if (isSupabaseConfigured && supabase) {
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
          .single();

        let profileData: UserProfile = {
          id: authUser.id,
          email: authUser.email || email,
          role: "user",
          status: "active"
        };

        if (profileErr || !profile) {
          // Se não existir perfil configurado na tabela (devido à falta de trigger), cria um perfil de usuário padrão
          const newProfile: UserProfile = { 
            id: authUser.id, 
            email: authUser.email || email, 
            role: "user" as const, 
            status: "active" as const 
          };
          await clientToUse.from("user_profiles").upsert([newProfile]).select().single();
          profileData = newProfile;
        } else {
          profileData = {
            id: profile.id,
            email: profile.email,
            role: profile.role as "admin" | "user",
            status: profile.status as "active" | "banned",
            created_at: profile.created_at,
            must_change_password: profile.must_change_password
          };
        }

        if (profileData.status === "banned") {
          return res.status(403).json({ error: "Sua conta foi banida. Entre em contato com o administrador." });
        }

        return res.json({
          user: profileData,
          session: data.session
        });

      } catch (err: any) {
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

    let isCallerAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const callerId = authHeader.split(" ")[1];
      if (callerId) {
        if (isSupabaseConfigured && supabase) {
          try {
            const clientToUse = supabaseAdmin || supabase;
            const { data: profile } = await clientToUse
              .from("user_profiles")
              .select("role")
              .eq("id", callerId)
              .maybeSingle();
            if (profile && profile.role === "admin") {
              isCallerAdmin = true;
            }
          } catch (err) {
            console.warn("Erro ao verificar admin no Supabase:", err);
          }
        } else {
          const db = loadLocalDB();
          const profile = db.users.find(u => u.id === callerId);
          if (profile && profile.role === "admin") {
            isCallerAdmin = true;
          }
        }
      }
    }

    // Apenas admins podem criar novas contas com a role 'admin'. Se for self-service, forçamos 'user'.
    const desiredRole = (role === "admin" && isCallerAdmin) ? "admin" : "user";
    
    // Se a conta for cadastrada por um admin (ex: senha inicial/temporária criada pelo painel), obrigamos trocar
    const mustChangePassword = isCallerAdmin;

    if (!email || !password) {
      return res.status(400).json({ error: "Preencha o campo de email e senha." });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let authUser;
        let authId = "";

        // Se o adminClient (Service Role Key) estiver disponível, criamos diretamente para burlar verificação de email
        if (supabaseAdmin) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              role: desiredRole
            }
          });

          if (error) return res.status(400).json({ error: error.message });
          authUser = data.user;
          authId = data.user.id;
        } else {
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

          if (error) return res.status(400).json({ error: error.message });
          authUser = data.user;
          if (data.user) authId = data.user.id;
        }

        if (!authId) {
          return res.status(400).json({ error: "Não foi possível criar o usuário no catálogo do Supabase." });
        }

        // Criar ou atualizar de forma resiliente o registro na tabela de user_profiles
        const clientToUseForReg = supabaseAdmin || supabase;
        
        // Verificar se já existe um registro correspondente (de triggers ou execuções paralelas)
        const { data: existingProfile, error: checkErr } = await clientToUseForReg
          .from("user_profiles")
          .select("id")
          .eq("id", authId)
          .maybeSingle();

        let profileErr = null;
        if (existingProfile) {
          // Atualiza o registro existente de forma explícita
          const { error: updateErr } = await clientToUseForReg
            .from("user_profiles")
            .update({
              role: desiredRole,
              status: "active",
              must_change_password: mustChangePassword
            })
            .eq("id", authId);
          profileErr = updateErr;
        } else {
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
          profileErr = insertErr;
        }

        if (profileErr) {
          console.error("Aviso: perfil não pôde ser inserido/atualizado na tabela de perfis:", profileErr.message);
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

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    if (isSupabaseConfigured && supabaseAdmin && isUUID) {
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
          console.warn("Aviso: perfil não pôde ser atualizado no Supabase", profileErr);
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supabaseBooks, error } = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Erro ao ler livros do Supabase. Usando banco local de contingência:", error);
          return res.json(db.books);
        }

        // Sincronizar livros do Supabase no local_db para garantir persistência após reboots do container
        let localDbChanged = false;
        if (supabaseBooks) {
          for (const sbBook of supabaseBooks) {
            const idx = db.books.findIndex(b => String(b.id) === String(sbBook.id));
            if (idx === -1) {
              db.books.push(sbBook);
              localDbChanged = true;
            }
          }
        }

        if (localDbChanged) {
          saveLocalDB(db);
        }

        return res.json(db.books);
      } catch (err: any) {
        console.warn("Exceção técnica ao buscar livros do Supabase. Usando banco local de contingência:", err);
        return res.json(db.books);
      }
    } else {
      return res.json(db.books);
    }
  });

  // Cadastrar Novo Livro + Upload via Base64
  app.post("/api/books", async (req, res) => {
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

        if (isSupabaseConfigured && supabase) {
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

        if (isSupabaseConfigured && supabase) {
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

      if (isSupabaseConfigured && supabase) {
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

  // Editar Livro existente
  app.put("/api/books/:id", async (req, res) => {
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

        if (isSupabaseConfigured && supabase) {
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

        if (isSupabaseConfigured && supabase) {
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

      if (isSupabaseConfigured && supabase) {
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

  // Excluir Livro existente
  app.delete("/api/books/:id", async (req, res) => {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
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
    // Nota: Em cenários reais, validamos permissões via cabeçalho Bearer do usuário
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        // Obter do Supabase Auth e perfis customizados
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
        if (authErr) {
          console.warn("Erro ao ler usuários Auth do Supabase:", authErr.message);
          const db = loadLocalDB();
          return res.json(db.users);
        }

        const { data: profiles, error: profileErr } = await supabaseAdmin
          .from("user_profiles")
          .select("*");

        if (profileErr) {
          console.warn("Erro ao buscar perfis no Supabase:", profileErr.message);
          const db = loadLocalDB();
          return res.json(db.users);
        }

        // Unificar as tabelas
        const unifiedUsers = authData.users.map(u => {
          const matchedProfile = profiles?.find(p => p.id === u.id);
          return {
            id: u.id,
            email: u.email || "",
            role: matchedProfile?.role || "user",
            status: matchedProfile?.status || "active",
            created_at: u.created_at
          };
        });

        return res.json(unifiedUsers);
      } catch (err: any) {
        console.warn("Exceção na listagem de usuários do Supabase, fallback local:", err.message);
        const db = loadLocalDB();
        return res.json(db.users);
      }
    } else {
      const db = loadLocalDB();
      return res.json(db.users);
    }
  });

  // Alterar senha de outro usuário (Apenas Admin)
  app.post("/api/users/:id/change-password", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 4 caracteres." });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isSupabaseConfigured && supabaseAdmin && isUUID) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
          password
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true, message: "Senha alterada com sucesso!" });
      } catch (err: any) {
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
    const { id } = req.params;
    const { status } = req.body; // 'active' ou 'banned'

    if (status !== "active" && status !== "banned") {
      return res.status(400).json({ error: "Status inválido." });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isSupabaseConfigured && supabase && isUUID) {
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
    const { id } = req.params;
    const { role } = req.body; // 'admin' ou 'user'

    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "Cargo inválido." });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isSupabaseConfigured && supabase && isUUID) {
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
    const { id } = req.params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isSupabaseConfigured && supabaseAdmin && isUUID) {
      try {
        // 1. Excluir perfil da tabela customizada
        await supabaseAdmin.from("user_profiles").delete().eq("id", id);
        // 2. Excluir da tabela principal do auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) return res.status(400).json({ error: error.message });

        return res.json({ success: true, message: "Usuário excluído com sucesso do Supabase Auth e perfis." });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = loadLocalDB();
      const userIndex = db.users.findIndex(u => u.id === id);
      if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado." });

      db.users.splice(userIndex, 1);
      delete db.passwords[id];
      saveLocalDB(db);
      return res.json({ success: true, message: "Usuário excluído com sucesso do banco local." });
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
