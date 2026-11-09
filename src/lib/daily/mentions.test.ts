import { describe, it, expect } from "vitest";
import {
  buildTeamNameIndex,
  extractMentions,
  resolveMentionId,
  textMentionsUser,
  pendingMentionComments,
} from "./mentions";

const TEAM = [
  { id: "u1", name: "João Silva" },
  { id: "u2", name: "Maria Souza" },
  { id: "u3", name: "Ana" },
];
const IDX = buildTeamNameIndex(TEAM);

describe("buildTeamNameIndex", () => {
  it("indexes names lowercase", () => {
    expect(IDX.get("joão silva")).toBe("u1");
    expect(IDX.get("JOÃO SILVA".toLowerCase())).toBe("u1");
    expect(IDX.get("ana")).toBe("u3");
  });
});

describe("resolveMentionId", () => {
  it("resolves case-insensitively", () => {
    expect(resolveMentionId("Maria Souza", IDX)).toBe("u2");
    expect(resolveMentionId("maria souza", IDX)).toBe("u2");
  });
  it("returns null for unknowns", () => {
    expect(resolveMentionId("Fulano", IDX)).toBeNull();
  });
});

describe("extractMentions", () => {
  it("returns [] for empty text", () => {
    expect(extractMentions("", IDX)).toEqual([]);
  });

  it("matches single-word mention", () => {
    expect(extractMentions("cc @Ana pfv", IDX)).toEqual(["Ana"]);
  });

  it("matches multi-word mention greedily", () => {
    expect(extractMentions("@João Silva pode ver?", IDX)).toEqual(["João Silva"]);
  });

  it("prefers longest matching prefix", () => {
    // Só "João Silva" está no time; "João Silva Santos" não existe.
    // Match guloso deve casar "João Silva" (2 palavras), não só "João".
    expect(extractMentions("@João Silva Santos revisou", IDX)).toEqual(["João Silva"]);
  });

  it("matches @todos", () => {
    expect(extractMentions("aviso a @todos", IDX)).toEqual(["todos"]);
  });

  it("ignores unknown names", () => {
    expect(extractMentions("@Fulano de Tal", IDX)).toEqual([]);
  });

  it("captures multiple mentions in one text", () => {
    const out = extractMentions("@João Silva e @Maria Souza — fyi @Ana", IDX);
    expect(out).toEqual(["João Silva", "Maria Souza", "Ana"]);
  });

  it("supports accented names in regex range", () => {
    const idx = buildTeamNameIndex([{ id: "u9", name: "Renée Álvarez" }]);
    expect(extractMentions("olá @Renée Álvarez", idx)).toEqual(["Renée Álvarez"]);
  });
});

describe("textMentionsUser", () => {
  it("matches direct mention by id", () => {
    expect(textMentionsUser("cc @Ana", "u3", IDX)).toBe(true);
    expect(textMentionsUser("cc @Ana", "u1", IDX)).toBe(false);
  });

  it("matches @todos for any user", () => {
    expect(textMentionsUser("aviso @todos", "u2", IDX)).toBe(true);
  });

  it("returns false when text has no mentions", () => {
    expect(textMentionsUser("sem menção aqui", "u1", IDX)).toBe(false);
  });

  it("uses cache when provided (same text hits once)", () => {
    const cache = new Map<string, string[]>();
    const text = "cc @João Silva";
    textMentionsUser(text, "u1", IDX, cache);
    expect(cache.has(text)).toBe(true);
    expect(cache.get(text)).toEqual(["João Silva"]);
    // Segunda chamada não muda o cache
    const sizeBefore = cache.size;
    textMentionsUser(text, "u2", IDX, cache);
    expect(cache.size).toBe(sizeBefore);
  });
});

describe("pendingMentionComments", () => {
  // u3 = Ana
  it("lista menção não respondida", () => {
    const cs = [{ id: "a", authorId: "u1", text: "@Ana veja" }];
    expect(pendingMentionComments(cs, "u3", IDX).map((c) => c.id)).toEqual(["a"]);
  });
  it("some quando o usuário responde explicitamente", () => {
    const cs = [
      { id: "a", authorId: "u1", text: "@Ana veja" },
      { id: "b", authorId: "u3", text: "feito", replyToId: "a" },
    ];
    expect(pendingMentionComments(cs, "u3", IDX)).toEqual([]);
  });
  it("comentário solto sem Responder não dá baixa", () => {
    const cs = [
      { id: "a", authorId: "u1", text: "@Ana veja" },
      { id: "b", authorId: "u3", text: "feito" },
    ];
    expect(pendingMentionComments(cs, "u3", IDX).map((c) => c.id)).toEqual(["a"]);
  });
  it("volta quando alguém responde à resposta do usuário", () => {
    const cs = [
      { id: "a", authorId: "u1", text: "@Ana veja" },
      { id: "b", authorId: "u3", text: "feito", replyToId: "a" },
      { id: "c", authorId: "u1", text: "e o outro?", replyToId: "b" },
    ];
    expect(pendingMentionComments(cs, "u3", IDX).map((c) => c.id)).toEqual(["c"]);
  });
});
