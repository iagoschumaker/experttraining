# Sistema de Temas - Expert Training

## 📋 Visão Geral

Sistema completo de temas claro/escuro implementado com React Context e Tailwind CSS, usando as cores oficiais do Expert Training.

## 🎨 Paleta de Cores

### Expert Training Brand Colors

**Primary - Azul Ciano**
- Default: `#00C2D1`
- Hover: `#00A9B6`
- Active: `#008E99`
- Focus: `#33D6E2`

**Accent - Amarelo Mostarda**
- Default: `#F2B705`
- Hover: `#D9A404`
- Soft (Dark): `#3A2E0A`
- Soft (Light): `#FFF4CC`

### Tema Escuro (Primário - 70% uso esperado)

**Backgrounds**
- Primary: `#0F1215` (Cinza carvão)
- Secondary: `#151A1F` (Cinza grafite)
- Surface/Cards: `#1C232B`
- Hover: `#2A333D`

**Borders**
- Default: `#2A333D`
- Dividers: `#323C47`

**Text**
- Primary: `#E6EAF0` (Branco suave)
- Secondary: `#AEB6C2` (Cinza claro)
- Disabled: `#7A8491` (Cinza opaco)

### Tema Claro (Secundário - Relatórios e legibilidade)

**Backgrounds**
- Primary: `#FFFFFF` (Branco puro)
- Secondary: `#F5F7FA` (Cinza muito claro)
- Surface/Cards: `#FFFFFF`

**Borders**
- Default: `#E2E8F0`

**Text**
- Primary: `#0F172A` (Cinza muito escuro)
- Secondary: `#475569` (Cinza médio)
- Disabled: `#94A3B8` (Cinza claro)

### Status Colors (Ambos os temas)
- Success: `#22C55E`
- Warning: `#F2B705` (Amarelo Expert)
- Error: `#EF4444`
- Info: `#00C2D1` (Cyan Expert)

## 🏗️ Arquitetura

### 1. Theme Context Provider

**Arquivo:** `src/contexts/ThemeContext.tsx`

```typescript
export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

export function ThemeProvider({ children }: { children: React.ReactNode })
export function useTheme(): ThemeContextType
```

**Funcionalidades:**
- Estado global do tema
- Toggle entre light/dark
- Persistência no localStorage (key: `expert-training-theme`)
- Aplica classe no `document.documentElement`
- Previne flash de conteúdo incorreto (mounted check)
- Default: `dark` (tema primário)

### 2. Theme Toggle Component

**Arquivo:** `src/components/ThemeToggle.tsx`

```typescript
export function ThemeToggle()
```

**Características:**
- Botão com ícones Sun (light) e Moon (dark)
- Transições suaves (rotate + scale)
- Variant: ghost
- Size: 9x9 (36px)
- Acessibilidade: title attribute
- Ícones: lucide-react

### 3. Integração nos Layouts

**Root Layout:** `src/app/layout.tsx`
```tsx
<html lang="pt-BR" suppressHydrationWarning>
  <body>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </body>
</html>
```

**Headers com Theme Toggle:**
- ✅ SuperAdmin: `src/components/layout/superadmin-header.tsx`
- ✅ Studio/Personal: `src/components/layout/app-header.tsx`
- Posição: Ao lado do botão de usuário (à esquerda)

### 4. Configuração Tailwind

**Arquivo:** `tailwind.config.ts`

```typescript
darkMode: ['class'],
theme: {
  extend: {
    colors: {
      // Shadcn compatibility (HSL variables)
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      // ... outros
      
      // Expert Training colors específicas
      'bg-primary': { DEFAULT: '#0F1215', light: '#FFFFFF' },
      'bg-secondary': { DEFAULT: '#151A1F', light: '#F5F7FA' },
      // ... outros
    }
  }
}
```

### 5. CSS Variables

**Arquivo:** `src/app/globals.css`

```css
:root {
  /* Light Theme Variables (HSL format) */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 187 100% 41%; /* #00C2D1 */
  --accent: 44 97% 48%; /* #F2B705 */
  /* ... */
}

.dark {
  /* Dark Theme Variables (HSL format) */
  --background: 216 20% 7%; /* #0F1215 */
  --foreground: 216 20% 91%; /* #E6EAF0 */
  --primary: 187 100% 41%; /* #00C2D1 */
  --accent: 44 97% 48%; /* #F2B705 */
  /* ... */
}
```

## 📖 Como Usar

### Usando Classes Tailwind com Temas

```tsx
// Backgrounds
<div className="bg-background">...</div>
<div className="bg-card">...</div>

// Text
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>

// Borders
<div className="border border-border">...</div>

// Primary color (cyan)
<Button className="bg-primary text-primary-foreground">
  Ação Primária
</Button>

// Accent color (yellow)
<Badge className="bg-accent text-accent-foreground">
  Destaque
</Badge>

// Dark mode específico
<div className="bg-white dark:bg-slate-900">
  Content adapts to theme
</div>
```

### Usando o Hook useTheme

```tsx
'use client'

import { useTheme } from '@/contexts/ThemeContext'

export function MyComponent() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>
        Switch to {theme === 'dark' ? 'light' : 'dark'}
      </button>
    </div>
  )
}
```

### Adicionando Theme Toggle em Novo Header

```tsx
import { ThemeToggle } from '@/components/ThemeToggle'

export function MyHeader() {
  return (
    <header>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
```

## 🎯 Proporções de Uso

De acordo com a especificação do cliente:

- **70%**: Tons de cinza (backgrounds, surfaces, borders)
- **20%**: Azul ciano (primary actions, links, destaques)
- **10%**: Amarelo mostarda (accents, warnings, badges especiais)

## ✅ Checklist de Implementação

### Completed
- ✅ Theme Context Provider criado
- ✅ Theme Toggle component criado
- ✅ CSS Variables configuradas (light + dark)
- ✅ Tailwind config atualizado com cores Expert Training
- ✅ Root layout com ThemeProvider
- ✅ SuperAdmin header com toggle
- ✅ Studio/Personal header com toggle
- ✅ Persistência localStorage
- ✅ Prevenção de flash (suppressHydrationWarning)

### Pending
- ⏳ Revisar todos os componentes para usar classes theme-aware
- ⏳ Atualizar componentes shadcn/ui customizados
- ⏳ Testar em todas as páginas (SuperAdmin, Studio, Personal)
- ⏳ Adicionar transições suaves em components específicos
- ⏳ Documentar guidelines de componentes

## 🚀 Próximos Passos

### 1. Validação
- Testar navegação entre todas as áreas
- Verificar persistência ao recarregar
- Testar responsividade do toggle

### 2. Refinamentos
- Ajustar contrastes se necessário
- Adicionar animações de transição de tema
- Otimizar performance

### 3. Expansão
- Criar variant components específicos
- Adicionar theme presets (high contrast, etc)
- Integrar com preferências do sistema

## 📝 Notas Técnicas

### HSL vs HEX
- CSS Variables usam HSL para compatibilidade shadcn/ui
- Tailwind config tem cores em HEX para facilitar leitura
- Conversão automática pelo Tailwind

### SSR/Hydration
- `suppressHydrationWarning` no `<html>` previne warnings
- Mounted check no ThemeProvider previne mismatches
- localStorage só é acessado no cliente

### Performance
- Context Provider no topo evita prop drilling
- Toggle é leve (apenas toggle de classe CSS)
- Sem re-renders desnecessários

### Acessibilidade
- Title attributes nos botões
- Contraste validado (WCAG AA)
- Ícones descritivos (Sun/Moon)

## 🐛 Troubleshooting

### Tema não persiste
- Verificar localStorage: `localStorage.getItem('expert-training-theme')`
- Verificar se ThemeProvider está no layout raiz

### Flash de tema errado
- Adicionar `suppressHydrationWarning` no `<html>`
- Verificar mounted check no ThemeContext

### Cores não aplicam
- Regenerar Tailwind: `npm run dev` (restart)
- Verificar classes CSS no inspector
- Confirmar se `darkMode: ['class']` está no config

### Toggle não funciona
- Verificar se componente é 'use client'
- Verificar importação do useTheme hook
- Verificar console para erros

## 📚 Referências

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [React Context API](https://react.dev/reference/react/createContext)
- [Next.js App Router](https://nextjs.org/docs/app)
