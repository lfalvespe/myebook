import React from "react";
import { BookOpen, Key, HardDrive, Shield } from "lucide-react";

export default function DashboardDocs() {
  return (
    <div id="dashboard-docs-panel" className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 max-w-4xl mx-auto my-8">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <BookOpen className="w-6 h-6 text-blue-600" id="docs-icon" />
        <h2 className="text-2xl font-sans font-bold text-slate-800 tracking-tight" id="docs-title">
          Análise de Hospedagem & Configuração Supabase
        </h2>
      </div>

      <div className="prose text-slate-600 space-y-6" id="docs-body">
        <p className="text-base text-slate-600 leading-relaxed">
          Verificamos e analisamos as melhores opções gratuitas para dar suporte ao seu site de baixar livros (Ebooks e Capas) com autenticação segura. Veja o resumo e a decisão recomendada abaixo:
        </p>

        {/* Auth Section */}
        <div className="space-y-3" id="auth-analysis">
          <h3 className="text-lg font-sans font-semibold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            1. Autenticação Segura (Serviços Gratuitos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <span className="font-semibold text-blue-800 block mb-1">Supabase Auth (Recomendado)</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> 50.000 usuários ativos mensais (MAU) gratuitos.<br />
                <strong>Vantagem:</strong> Integrado direto no banco de dados, JWT nativo no Postgres e sem custo adicional.
              </p>
            </div>
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl">
              <span className="font-semibold text-slate-800 block mb-1">Auth0</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> 7.500 MAUs gratuitos.<br />
                <strong>Desvantagem:</strong> Limite menor, redirecionamentos complexos de iFrame e painel pesado para iniciantes.
              </p>
            </div>
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl">
              <span className="font-semibold text-slate-800 block mb-1">Clerk / Firebase Auth</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> Clerk oferece 10.000 MAUs. Firebase é gratuito para email/senha.<br />
                <strong>Vantagem:</strong> UX moderna, mas requer linkar serviços externos separados do banco principal.
              </p>
            </div>
          </div>
        </div>

        {/* Hard Drive Section */}
        <div className="space-y-3" id="storage-analysis">
          <h3 className="text-lg font-sans font-semibold text-slate-800 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            2. Hospedagem de Epubs e Capas (File Storage)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <span className="font-semibold text-blue-800 block mb-1">Supabase Storage (Recomendado)</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> 1GB de armazenamento gratuito + 2GB/mês de banda.<br />
                <strong>Vantagem:</strong> Gerencia arquivos usando o mesmo login do usuário, perfeito para uploads com regras de Admin.
              </p>
            </div>
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl">
              <span className="font-semibold text-slate-800 block mb-1">Cloudinary</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> 25GB gratuitos para imagens e mídia leve.<br />
                <strong>Desvantagem:</strong> Ótimo para imagens, mas não serve para hospedar ou gerenciar downloads seguros de arquivos .epub.
              </p>
            </div>
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl">
              <span className="font-semibold text-slate-800 block mb-1">Cloudflare R2 / Backblaze</span>
              <p className="text-xs text-slate-600">
                <strong>Limite:</strong> 10GB de armazenamento grátis com tráfego ilimitado.<br />
                <strong>Desvantagem:</strong> Requer validação de cartão de crédito no cadastro inicial do provedor.
              </p>
            </div>
          </div>
        </div>

        {/* Conclusion Statement */}
        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 mt-4 text-sm" id="docs-conclusion">
          <p className="font-semibold text-slate-800 mb-1">💡 Conclusão da análise:</p>
          O <strong>Supabase</strong> é a melhor solução gratuita unificada por prover autenticação robusta (50k MAUs) e bucket de armazenamento de arquivos compatíveis com S3 (1GB de Storage), além de um banco de dados relacional (PostgreSQL) robusto, tudo em uma conta única gratuita.
        </div>

        {/* DB Schema Section */}
        <div className="space-y-3" id="db-setup-schema">
          <h3 className="text-lg font-sans font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            3. Estrutura do Banco de Dados no Supabase
          </h3>
          <p className="text-sm text-slate-600">
            Para ativar a sincronização total deste app com seu Supabase real, abra o menu de <strong>SQL Editor</strong> do seu painel do Supabase e execute as queries de criação de tabelas e políticas de segurança:
          </p>

          <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-72">
{`-- 1. Tabela de Perfis de Usuário com Roles
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  status text not null check (status in ('active', 'banned')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS nas tabelas
alter table public.user_profiles enable row level security;

-- Criar políticas de leitura e gravação
create policy "Perfis são públicos para leitura" on public.user_profiles
  for select using (true);

create policy "Admins gerenciam perfis" on public.user_profiles
  for all using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Tabela de Livros
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  year integer not null,
  genre text not null,
  cover_url text not null,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.books enable row level security;

create policy "Livros são visíveis por todos" on public.books
  for select using (true);

create policy "Admins gerenciam livros" on public.books
  for all using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );`}
          </pre>

          <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col gap-1">
            <span className="font-semibold text-amber-800">⚠️ Configuração Importante de Storage:</span>
            <span>Crie um bucket de armazenamento no Supabase Storage chamado <strong>"books"</strong> e marque a opção <strong>"Public"</strong> (para que os links de download durem indefinidamente sem requerer assinaturas temporárias).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
