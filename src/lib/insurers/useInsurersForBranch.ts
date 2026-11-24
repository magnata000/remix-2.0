import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Branch, Insurer } from "@/lib/mock/data";
import { getInsurersForBranch } from "@/lib/insurers/insurerStore";
import { listBranches, listInsurers } from "@/lib/portfolio/portfolio.functions";
import { listInsurerBranches } from "@/lib/settings/settings.functions";

/** Seguradoras ativas que atuam no ramo (Configurações). Sem vínculos cadastrados, aparece em todos. */
export function useInsurersForBranch(branch: Branch, enabled = true): Insurer[] {
  const bFn = useServerFn(listBranches);
  const iFn = useServerFn(listInsurers);
  const lFn = useServerFn(listInsurerBranches);
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: () => bFn(), enabled });
  const { data: insurers } = useQuery({ queryKey: ["insurers"], queryFn: () => iFn(), enabled });
  const { data: links } = useQuery({ queryKey: ["insurer-branches"], queryFn: () => lFn(), enabled });
  return useMemo(() => {
    if (!branches || !insurers || !links) return [...getInsurersForBranch(branch)];
    const bId = branches.find((b) => b.name === branch)?.id;
    const linked = new Set(links.map((l) => l.insurerId));
    const ok = new Set(links.filter((l) => l.branchId === bId).map((l) => l.insurerId));
    const list = insurers
      .filter((i) => i.isActive && (!linked.has(i.id) || ok.has(i.id)))
      .map((i) => i.name as Insurer);
    return list.length ? list : [...getInsurersForBranch(branch)];
  }, [branch, branches, insurers, links]);
}
