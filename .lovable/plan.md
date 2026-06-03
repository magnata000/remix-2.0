## Objetivo
Adicionar máscaras de input para **CPF/CNPJ** e **Telefone** no formulário de Novo Cliente, alinhando ao padrão já criado para a data de nascimento.

## Alterações

### `src/components/portfolio/NewClientDialog.tsx`

Adicionar dois helpers locais no mesmo arquivo (junto de `maskDate`):

**`maskPhone(input: string): string`**
- Remove não-dígitos, limita a 11 dígitos.
- `≤2` → `(dd`
- `≤6` → `(dd) dddd`
- `≤10` (fixo) → `(dd) dddd-dddd`
- `11` (celular) → `(dd) ddddd-dddd`

**`maskCpfCnpj(input: string): string`**
- Remove não-dígitos, limita a 14 dígitos.
- Se `≤11`: formata como CPF `ddd.ddd.ddd-dd` progressivamente.
- Se `>11`: formata como CNPJ `dd.ddd.ddd/dddd-dd` progressivamente.

Aplicar nos inputs:
- Telefone: `onChange={(e) => setPhone(maskPhone(e.target.value))}`, `inputMode="numeric"`, `maxLength={16}`.
- CPF/CNPJ: `onChange={(e) => setDocument(maskCpfCnpj(e.target.value))}`, `inputMode="numeric"`, `maxLength={18}`, placeholder `"000.000.000-00"`.

Validação Zod permanece a mesma (min/max de caracteres já cobrem ambos os formatos mascarados).

## Validação
Digitar `11987654321` no telefone → mostra `(11) 98765-4321`. Digitar `1133334444` → mostra `(11) 3333-4444`. Digitar `12345678901` no documento → mostra `123.456.789-01`. Digitar `12345678000199` → mostra `12.345.678/0001-99`. Submeter funciona normalmente.
