# Área de Membros - Apostolado Imaculada Corredentora

Este projeto é uma área de membros moderna com estética sacra, desenvolvida com
React, Tailwind CSS e Framer Motion.

## Como Iniciar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Acesse `http://localhost:5173` no seu navegador.

## Personalização

O código foi estruturado para facilitar a personalização. Abaixo estão os
principais pontos de edição:

### Cores e Fontes

As cores e fontes globais estão definidas no arquivo `tailwind.config.js`.

- **Cores**: Procure por `colors: { sacred: { ... } }`.
- **Fontes**: Procure por `fontFamily`.

### Módulos e Conteúdo

Para alterar os módulos exibidos no Painel (Dashboard):

- Abra `src/pages/Dashboard.tsx`.
- Edite o array `initialModules` no início do arquivo. Você pode alterar
  títulos, descrições e ícones.

### Textos e Estilos de Componentes

- **Botões**: `src/components/Button.tsx`
- **Inputs**: `src/components/Input.tsx`
- **Login/Registro**: `src/pages/Login.tsx` e `src/pages/Register.tsx`

### Autenticação

A autenticação é simulada no arquivo `src/hooks/useAuth.ts`. Para integrar com
um backend real (como Firebase ou Supabase), altere a lógica dentro deste hook.

## Estrutura de Pastas

- `src/components`: Componentes reutilizáveis (Botões, Cards, Layout).
- `src/pages`: Páginas da aplicação (Login, Dashboard, etc).
- `src/hooks`: Lógica compartilhada (Autenticação).
- `src/styles`: Arquivos de estilo globais.

## Tecnologias

- **Vite**: Build tool rápida.
- **React**: Biblioteca para interface.
- **Tailwind CSS**: Estilização utilitária.
- **Framer Motion**: Animações suaves.
- **Lucide React**: Ícones.
