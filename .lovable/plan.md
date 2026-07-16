## Objetivo

Adicionar, na aba **Carteira → Apólices**, um botão **"Importar PDF"** que lê uma apólice em PDF, extrai os campos via IA (Google Gemini pela Lovable AI Gateway) e abre a `NewPolicyDialog` já preenchida, após uma tela de revisão (diff) onde o usuário confirma/edita cada campo antes de aplicar.

Escopo inicial: **ramo Auto** apenas. Demais ramos ficam para um próximo ciclo (o mesmo pipeline será reaproveitado).

---

## Arquitetura recomendada

```text
[User] → Botão "Importar PDF" (PoliciesTab)
      → Envia PDF (base64) para server function
      → Server function chama Lovable AI Gateway
         (google/gemini-3.1-flash-lite, PDF nativo, output estruturado)
      → Retorna JSON validado por Zod
      → Modal de revisão (ImportPolicyReviewDialog): diff + edição campo-a-campo
      → Ao confirmar: abre NewPolicyDialog com defaults preenchidos
      → Usuário revisa uma última vez e salva (fluxo atual)
```

**Por que Gemini e não GPT:** Gemini aceita PDF nativamente como `inlineData` (multi-página, com OCR de páginas escaneadas). Custa uma fração do GPT-5.5 para o mesmo trabalho. `gemini-3.1-flash-lite` é o modelo mais barato do catálogo com input multimodal — ideal para extração estruturada de alta volume.

**Por que server function e não client-side:**
- `LOVABLE_API_KEY` só existe no servidor (nunca expor no browser).
- Permite anexar PDF grande sem passar por CORS/limites do browser.
- Vai bater com o padrão TanStack já usado no projeto (`createServerFn` + `.functions.ts`).

---

## Detalhes técnicos

### 1. Novo módulo: `src/lib/portfolio/policyExtraction.functions.ts`

Server function `extractPolicyFromPdf`:
- Input: `{ fileBase64: string; mimeType: string }` (validado com Zod; limite ~10MB).
- Handler:
  1. Lê `LOVABLE_API_KEY` de `process.env`.
  2. Monta request `/v1/chat/completions` com `google/gemini-3.1-flash-lite`, `messages` contendo bloco `text` (prompt) + bloco `file` (PDF em `data:application/pdf;base64,…`).
  3. Usa `response_format: { type: "json_object" }` + prompt explícito com a shape esperada (não usa `Output.object` com `structuredOutputs` porque Gemini funciona melhor com json_object livre + validação Zod no retorno).
  4. Parseia o JSON, valida com Zod, retorna `{ fields, confidence, warnings }`.
- Prompt: pede extração para ramo Auto — `clientName`, `clientDocument` (CPF/CNPJ), `insurer` (enum: Porto Seguro/Bradesco/SulAmérica/Allianz/Mapfre), `premium` (número), `startDate` / `endDate` (ISO), `policyNumber`, e um `confidence` por campo (0..1). Instrui a retornar `null` quando não encontrar, nunca alucinar.

### 2. Helper `src/lib/ai-gateway.server.ts` (novo)

Copiar exatamente o padrão do knowledge `ai-sdk-lovable-gateway` — mesmo se aqui não usarmos AI SDK, o helper isola URL/headers/`Lovable-API-Key` num único ponto para uso futuro (chat, embeddings). Para este caso vamos usar `fetch` direto porque é mais leve que o AI SDK para uma chamada única multimodal.

### 3. Client middleware para bearer token

O projeto já roda com Supabase; verificar se `src/start.ts` tem middleware que anexa token. Como a função `extractPolicyFromPdf` **não** precisa de auth (não toca banco), fica pública — mas colocá-la sob `_authenticated` conceitualmente exigiria auth. Decisão: manter sem `requireSupabaseAuth` para simplicidade, com rate-limit via UI (botão desabilita enquanto processa).

### 4. UI — mudanças em `src/components/portfolio/PoliciesTab.tsx`

Adicionar botão **"Importar PDF"** ao lado de **"Nova apólice"**, com ícone `FileUp` (lucide). Abre um `<input type="file" accept="application/pdf">` oculto.

Ao selecionar arquivo:
- Converte para base64 no browser (`FileReader.readAsDataURL`).
- Chama `extractPolicyFromPdf` via `useServerFn`.
- Enquanto processa: `toast.loading("Lendo PDF...")` + spinner no botão.
- Ao concluir: abre `ImportPolicyReviewDialog`.

### 5. Novo componente: `src/components/portfolio/ImportPolicyReviewDialog.tsx`

Modal com:
- Lista de campos extraídos, cada linha: `Label`, `Input` editável, badge de confiança (verde ≥0.8, amarelo 0.5–0.8, vermelho <0.5), e ícone de "extraído da IA".
- `Alert` no topo listando warnings do modelo (ex.: "Campo prêmio ambíguo").
- Cliente é matched com `useClients().findByName` — se não bater, oferece "criar cliente com estes dados" (fora do escopo v1: só mostra o nome extraído e deixa o usuário selecionar/criar na `NewPolicyDialog`).
- Botão **"Continuar"** → fecha este modal e abre `NewPolicyDialog` passando um novo prop `prefill` com os valores validados.

### 6. `NewPolicyDialog` — adicionar prop `prefill`

Estender o `useEffect` de reset para, quando `prefill` estiver presente e `open=true`, popular os states iniciais (branch fixo em "Auto" por enquanto, insurer/premium/startDate/endDate/clientName vindos do prefill). Match do `clientId` pelo nome via `clients.find`.

---

## Custo estimado (Lovable AI Gateway)

`google/gemini-3.1-flash-lite` — precificação por token via AI Gateway (créditos Lovable):

- **Input típico** por PDF de apólice Auto (2–4 páginas, ~3-8k tokens incluindo imagens processadas pelo Gemini): ~5k tokens.
- **Output típico** (JSON estruturado com ~10 campos): ~300 tokens.
- **Custo real por leitura:** valor exato depende da precificação corrente do modelo no AI Gateway. Ordem de grandeza estimada: **menos de 0,05 crédito Lovable por PDF** (fração mínima). Para 1.000 PDFs/mês, estimativa < 50 créditos.

**Não posso cravar o valor exato** — a tabela de preços por milhão de tokens do gateway varia por modelo e é ajustada pelo Lovable. Para o número real:
1. Após implementar, executar 1 extração de teste.
2. Consultar via `ai_gateway_logs--list_ai_gateway_requests` (retorna `cost` em créditos por request).
3. Ou verificar em Settings → Plans & credits o consumo antes/depois.

Se o custo se mostrar relevante em produção, mudar para modelo ainda mais barato (`google/gemini-2.5-flash-lite`) é uma linha de código.

---

## Ordem de execução (build mode)

1. Criar `src/lib/ai-gateway.server.ts` (helper mínimo com `LOVABLE_AI_GATEWAY_URL` + header).
2. Criar `src/lib/portfolio/policyExtraction.functions.ts` (server function + Zod schema + prompt).
3. Criar `src/components/portfolio/ImportPolicyReviewDialog.tsx`.
4. Estender `NewPolicyDialog` com prop `prefill?: Partial<PolicyPrefill>`.
5. Adicionar botão "Importar PDF" + orquestração em `PoliciesTab.tsx`.
6. Testar com 1 PDF real de apólice Auto (usuário fornece), medir custo via `ai_gateway_logs`.
7. Reportar custo real ao usuário.

## Fora de escopo desta iteração

- Ramos Saúde/Consórcio/Vida/etc. (mesma pipeline, prompt diferente — próximo ciclo).
- Criação automática de cliente quando não bate.
- Persistência do PDF original como anexo da apólice (o `useDocumentStore` já existe, integração fica para depois).
- Fallback client-side (pdfjs + regex).

## Verificação

- Typecheck 100% verde.
- Teste manual: subir PDF → ver toast de progresso → ver diff modal → confirmar → ver `NewPolicyDialog` preenchida.
- `ai_gateway_logs--list_ai_gateway_requests` retorna a chamada com status 200 e o `cost`.
