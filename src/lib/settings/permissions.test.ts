import { describe, expect, it } from "vitest";
import { appRoleFor, defaultPermissions } from "./permissions";
import { canAccessModule } from "@/lib/auth/moduleAccess";

describe("permissões por usuário", () => {
  it("Comercial não recebe Configurações nem Financeiro por padrão", () => {
    const p = defaultPermissions("comercial");
    expect(p).not.toContain("configuracoes");
    expect(p).not.toContain("financeiro_comissoes");
  });
  it("Pós-venda não acessa o Financeiro por padrão", () => {
    expect(canAccessModule(defaultPermissions("pos_venda"), "financial")).toBe(false);
  });
  it("Kanban abre só com Tarefas liberada", () => {
    expect(canAccessModule(["kanban_tarefas"], "kanban")).toBe(true);
  });
  it("Role Comercial mapeia para o papel técnico vendedor", () => {
    expect(appRoleFor("comercial")).toBe("vendedor");
  });
});
