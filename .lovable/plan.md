# Formulário de Nova Oportunidade

Hoje o botão **+ Nova oportunidade** no `KanbanModule` não tem ação. O plano é abrir um `Dialog` com um formulário estruturado, validado e já conectado ao `pipelineStore.createFromQuote` / novo `create`.

## 1. Novo componente: `src/components/pipeline/NewOpportunityDialog.tsx`

Diálogo modal (shadcn `Dialog`) acionado pelo botão do header da aba Pipeline. Segue o mesmo padrão visual do `NewTaskDialog`.

### Campos do formulário

Agrupados em 3 blocos para evitar parede de inputs:

**Bloco 1 — Cliente**
- `Cliente` (Combobox com `clients` do mock + opção "Novo cliente" que libera um input livre de nome)
- `Telefone` (opcional, prefill se cliente existente)
- `E-mail` (opcional, prefill se cliente existente)

**Bloco 2 — Oportunidade**
- `Título` (input, obrigatório, máx 80) — placeholder "Ex: Renovação Auto"
- `Ramo` (Select: Auto / Vida / Residencial / Empresarial / Saúde — obrigatório)
- `Etapa inicial` (Select: Lead / Cotação / Negociação — default `lead`; oculta "Fechado" e "Perdido")
- `Valor estimado (R$)` (input numérico, obrigatório, min 0)
- `Prazo` (DatePicker, obrigatório, default = hoje + 7 dias)

**Bloco 3 — Atribuição**
- `Responsável` (Select com iniciais a partir de `team` em `data.ts` — default = usuário atual `AS`)
- `Observações` (Textarea opcional, máx 280 — apenas armazenado, exibido depois no card)

### Validação (zod)
```
title: string min1 max80
clientName: string min1 max80
branch: enum Branch
stage: enum (lead|cotacao|negociacao)
estimatedValue: number min0
dueDate: string ISO (não anterior a hoje)
assignee: string len2
```
Erros exibidos abaixo de cada campo; toast de sucesso ao salvar.

### Footer
- `Cancelar` (fecha)
- `Criar oportunidade` (disabled enquanto inválido)

## 2. Mudanças no store — `src/lib/pipeline/opportunityStore.ts`

Adicionar ação genérica `createOpportunity(input)` (sem exigir `quoteGroupId`):

```ts
createOpportunity: (input: {
  title: string; clientName: string; branch: Branch;
  estimatedValue: number; dueDate: string; assignee: string;
  stage: KanbanStage;
}) => Opportunity
```
Implementação espelha `createFromQuote`, mas sem `quoteGroupId` e respeitando `stage` recebido. Gera id `t{Date.now()}` e faz prepend.

## 3. Integração no `KanbanModule.tsx`

- Importar `NewOpportunityDialog`.
- Estado local `const [openNew, setOpenNew] = useState(false)`.
- Trocar o `<Button>` "Nova oportunidade" por trigger que seta `openNew=true`.
- Renderizar `<NewOpportunityDialog open={openNew} onOpenChange={setOpenNew} />` ao final da aba pipeline.

Após criação:
- toast `"Oportunidade criada"`.
- Card aparece imediatamente na coluna escolhida (estado já reativo).
- Sem `quoteGroupId` → o CTA do card já exibe "Cotar no Multicálculo" (comportamento existente).

## 4. Detalhes UX

- O combobox de cliente filtra os 25 mocks por nome; selecionar preenche telefone/e-mail (read-only). "Novo cliente" desbloqueia campos editáveis.
- Valor estimado formatado em BRL no blur (`formatBRL`).
- Etapa inicial: ícone colorido ao lado do label, espelhando os badges das colunas.
- Responsivo: largura `sm:max-w-[560px]`, scroll interno se necessário.
- Atalho: Enter no último campo dispara submit; Esc fecha.

## Arquivos tocados

- `src/components/pipeline/NewOpportunityDialog.tsx` (novo)
- `src/lib/pipeline/opportunityStore.ts` (adiciona `createOpportunity`)
- `src/components/modules/KanbanModule.tsx` (liga botão + monta dialog)

Sem mudanças em rotas, tipos globais ou em outros módulos.
