## Objetivo
Substituir o `<Input type="date">` no formulário de Novo Cliente por um campo de texto com **máscara `dd/mm/aaaa`**, mantendo o armazenamento interno em ISO (`YYYY-MM-DD`).

## Alterações

### `src/components/portfolio/NewClientDialog.tsx`
- Trocar o estado `birthDate` (ISO) por `birthDateMasked` (string no formato `dd/mm/aaaa` enquanto o usuário digita).
- Criar helper local `maskDate(input: string): string` que:
  - Remove tudo que não é dígito, limita a 8 dígitos.
  - Insere as barras automaticamente: `dd`, `dd/mm`, `dd/mm/aaaa`.
- Criar helper `toISO(masked: string): string | null` que converte `dd/mm/aaaa` para `YYYY-MM-DD` validando dia/mês/ano reais (usar `new Date(y, m-1, d)` e conferir se os componentes batem).
- Atualizar o `<Input>`:
  - `type="text"` com `inputMode="numeric"`, `placeholder="dd/mm/aaaa"`, `maxLength={10}`.
  - `onChange` aplica `maskDate` antes de setar o estado.
- Validação no `submit`:
  - Converter `birthDateMasked` via `toISO`; se `null`, setar `errors.birthDate = "Data inválida"`.
  - Schema Zod passa a validar o ISO resultante (mesma regex/refine de data não-futura já existente).
- Resetar `birthDateMasked` para `""` no `useEffect` de abertura.
- Mensagem de erro continua abaixo do input.

## Validação
Abrir "Novo cliente" → digitar `15081990` no campo de nascimento → ver `15/08/1990` aparecendo automaticamente. Digitar `32/13/2030` → ao submeter, erro "Data inválida". Submeter `15/08/1990` → cliente criado, drawer exibe `15/08/1990 · 35 anos` (ou idade correta).
