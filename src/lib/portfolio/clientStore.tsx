import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { clients as seedClients, type Client, type ClientStatus } from "@/lib/mock/data";

type AddClientInput = Omit<Client, "id">;

type Ctx = {
  clients: Client[];
  addClient: (input: AddClientInput) => Client;
  updateClient: (id: string, patch: Partial<AddClientInput>) => void;
  setClientStatus: (id: string, status: ClientStatus) => void;
  findByName: (name: string) => Client | undefined;
};

const ClientCtx = createContext<Ctx | null>(null);

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() => seedClients);

  const addClient = useCallback((input: AddClientInput) => {
    const client: Client = { id: `c${Date.now()}`, ...input };
    setClients((arr) => [client, ...arr]);
    return client;
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<AddClientInput>) => {
    setClients((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const setClientStatus = useCallback((id: string, status: ClientStatus) => {
    setClients((arr) => arr.map((c) => (c.id === id ? { ...c, statusOverride: status } : c)));
  }, []);

  const findByName = useCallback(
    (name: string) => clients.find((c) => c.name === name),
    [clients],
  );

  return (
    <ClientCtx.Provider value={{ clients, addClient, updateClient, setClientStatus, findByName }}>
      {children}
    </ClientCtx.Provider>
  );
}

export function useClients() {
  const c = useContext(ClientCtx);
  if (!c) throw new Error("useClients must be used within ClientStoreProvider");
  return c;
}

/** @deprecated Use `useClients()`. Alias mantido para compatibilidade. */
export const useClients = useClients;
