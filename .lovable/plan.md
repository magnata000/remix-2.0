## Objetivo
Adicionar **Data de Nascimento** ao cadastro de cliente e exibi-la no Drawer lateral junto com as informações cadastrais, com a **idade atual** ao lado de forma discreta.

## Alterações

### 1. `src/lib/mock/data.ts`
- Adicionar campo opcional `birthDate?: string` (ISO `YYYY-MM-DD`) ao tipo `Client`.
- Popular `birthDate` no array `clients` gerado (datas distribuídas entre 1960–2000, derivadas do índice para serem determinísticas).

### 2. `src/lib/portfolio/clientStore.tsx`
- Nenhuma mudança estrutural — `AddClientInput = Omit<Client, "id">` já passa o novo campo automaticamente.

### 3. `src/components/portfolio/NewClientDialog.tsx`
- Adicionar campo `birthDate` no estado e no schema Zod (`z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")`, obrigatório).
- Renderizar `<Input type="date" />` ao lado do CPF/CNPJ (mudar grid de 2 para 3 colunas ou criar nova linha) com label "Data de nascimento *".
- Incluir `birthDate` no payload de `addClient`.
- Resetar campo no `useEffect` de abertura.

### 4. `src/components/portfolio/ClientDetailDrawer.tsx`
- Criar helper local `calcAge(iso: string): number` (calcula idade considerando mês/dia atual).
- Na seção "Contato" (grid 3 colunas), adicionar quarta linha/card `<ContactRow>` com ícone `Cake` (lucide) mostrando `formatDateShort(c.birthDate)` e, ao lado, `<span className="text-[11px] text-muted-foreground">· {idade} anos</span>` de forma sutil.
- Ajustar grid para `sm:grid-cols-2 lg:grid-cols-4` para acomodar o novo item sem quebrar o layout.
- Renderizar o card de nascimento somente se `c.birthDate` existir (compatibilidade com clientes sem data).

## Validação
Abrir "Novo cliente" → preencher todos os campos incluindo data de nascimento → criar. Abrir o drawer do novo cliente → ver linha de Contato com Telefone, E-mail, Documento e Data de nascimento + idade calculada ao lado em cinza discreto. Clientes seed também exibem a data.
