/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Client, ClientStatus } from "@/lib/mock/data";
import {
  createClient as createClientFn,
  deleteClient as deleteClientFn,
  listClients,
  setClientStatus as setClientStatusFn,
  updateClient as updateClientFn,
} from "@/lib/portfolio/carteira.functions";

type AddClientInput = Omit<Client, "id">;

type Ctx = {
  clients: Client[];
  isLoading: boolean;
  addClient: (input: AddClientInput) => Promise<Client>;
  updateClient: (id: string, patch: Partial<AddClientInput>) => Promise<void>;
  setClientStatus: (id: string, status: ClientStatus) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  findByName: (name: string) => Client | undefined;
};

const ClientCtx = createContext<Ctx | null>(null);

export const CLIENTS_KEY = ["clients"] as const;

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const fetchClients = useServerFn(listClients);
  const create = useServerFn(createClientFn);
  const update = useServerFn(updateClientFn);
  const setStatus = useServerFn(setClientStatusFn);
  const remove = useServerFn(deleteClientFn);

  const { data, isLoading } = useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: () => fetchClients(),
  });

  const clients = data ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: CLIENTS_KEY });
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: (input: AddClientInput) => create({ data: input }),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<AddClientInput> }) => update({ data: vars }),
    onSuccess: invalidate,
  });
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: ClientStatus }) => setStatus({ data: vars }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["policies"] });
      void qc.invalidateQueries({ queryKey: ["commissions"] });
      void qc.invalidateQueries({ queryKey: ["followUps"] });
      void qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const addClient = useCallback(
    (input: AddClientInput) => createMutation.mutateAsync(input),
    [createMutation],
  );
  const updateClient = useCallback(
    async (id: string, patch: Partial<AddClientInput>) => {
      await updateMutation.mutateAsync({ id, patch });
    },
    [updateMutation],
  );
  const setClientStatus = useCallback(
    async (id: string, status: ClientStatus) => {
      await statusMutation.mutateAsync({ id, status });
    },
    [statusMutation],
  );

  const findByName = useCallback((name: string) => clients.find((c) => c.name === name), [clients]);

  const value = useMemo<Ctx>(
    () => ({ clients, isLoading, addClient, updateClient, setClientStatus, findByName }),
    [clients, isLoading, addClient, updateClient, setClientStatus, findByName],
  );

  return <ClientCtx.Provider value={value}>{children}</ClientCtx.Provider>;
}

export function useClients() {
  const c = useContext(ClientCtx);
  if (!c) throw new Error("useClients must be used within ClientStoreProvider");
  return c;
}

/** @deprecated Use `useClients()`. Alias mantido para compatibilidade. */
export { useClients as useClientStore };
