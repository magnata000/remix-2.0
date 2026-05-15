# Corrigir loop infinito ao abrir grupo de cotação vinda do Pipeline

## Causa raiz

`NavigationProvider` (`src/lib/navigation.tsx`):

```ts
const consumeFocus = useCallback(() => {
  const current = focus;
  setFocus({});
  return current;
}, [focus]); // ← muda a cada setFocus
```

`MulticalcModule`:

```ts
useEffect(() => {
  const f = consumeFocus();
  if (f.quoteGroupId) { setTab("historico"); setFocusedGroupId(f.quoteGroupId); }
}, [consumeFocus]); // ← re-executa quando consumeFocus muda
```

Cada chamada de `consumeFocus()` faz `setFocus({})` (novo objeto, sem bail-out de identidade) → `focus` muda → `consumeFocus` ganha nova referência → effect roda de novo → setFocus de novo → loop.

## Correção

Tornar `consumeFocus` **estável** usando um `useRef` em vez de depender do estado, e manter `focus` em estado só pelo que for realmente reativo.

### Mudança 1 — `src/lib/navigation.tsx`

Substituir o estado `focus` por uma referência mutável + função estável:

```ts
const focusRef = useRef<Focus>({});

const goTo = useCallback((module, f) => {
  focusRef.current = f ?? {};
  setActive(module);
}, [setActive]);

const consumeFocus = useCallback(() => {
  const current = focusRef.current;
  focusRef.current = {};
  return current;
}, []); // sem dependências — referência estável
```

Remover o `focus` do contexto (consumidores só usam `consumeFocus`/`goTo`). Se algum dia precisar reagir a mudanças, criamos um sinal separado; hoje nenhum componente lê `focus` diretamente.

### Mudança 2 — opcional, defensiva — `MulticalcModule`

Trocar o `useEffect` por **lazy init de useState** (mesmo padrão do `KanbanModule`), eliminando a dependência reativa e o risco de re-execução:

```ts
const [tab, setTab] = useState<"nova" | "historico" | "comparar">(() => {
  const f = consumeFocus();
  if (f.quoteGroupId) return "historico";
  return "nova";
});
const [focusedGroupId, setFocusedGroupId] = useState<string | null>(() => {
  // já consumido acima — guardar via ref no provider resolveria,
  // alternativa: ler ambos em uma única chamada antes do useState
  return null;
});
```

Como `consumeFocus` agora limpa o ref, chamá-lo duas vezes no mesmo mount perderia info. Solução: **uma só chamada** no topo do componente, antes dos `useState`:

```ts
const initialFocus = useMemo(() => consumeFocus(), []); // 1x no mount
const [tab, setTab] = useState(initialFocus.quoteGroupId ? "historico" : "nova");
const [focusedGroupId, setFocusedGroupId] = useState(initialFocus.quoteGroupId ?? null);
```

Remover o `useEffect` antigo que dependia de `consumeFocus`.

### Mudança 3 — alinhar `KanbanModule`

Aplicar o mesmo padrão `useMemo(() => consumeFocus(), [])` para consistência (hoje funciona porque está em `useState` lazy init, mas o padrão único é mais previsível).

## Por que isso resolve

- `consumeFocus` deixa de mudar de referência → efeitos/memos que dependem dele não disparam em cascata.
- Cada módulo lê o foco **uma única vez** no mount, exatamente quando o `goTo` da navegação trocou o módulo ativo.
- Ref evita render extra ao limpar o foco (não há `setState`).

## Critérios de aceitação

- Clicar em "🔗 No pipeline · Cotação" no Multicálculo navega ao Kanban e destaca o card sem erro.
- Clicar no chip "N cotações · vN" no Kanban abre o Multicálculo no Histórico, com o grupo expandido e scroll, sem "Maximum update depth".
- Trocar de módulo várias vezes não dispara loops.
- Sem mudança de comportamento dos outros módulos.

## Fora de escopo

- Refatorar a forma como módulos são montados (`active === "x" && <Module />` continua igual).
- Persistir foco em URL (poderia ser feito depois, com `validateSearch`).
