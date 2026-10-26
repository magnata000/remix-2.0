import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PolicyReasonDialog } from "@/components/portfolio/PolicyReasonDialog";
import { useNavigation } from "@/lib/navigation";
import {
  deleteNotification,
  listNotifications,
  markNotificationsRead,
  type NotificationRow,
} from "@/lib/settings/settings.functions";
import { cn } from "@/lib/utils";

const isPending = (n: NotificationRow) => (n.isActionable ? !n.resolvedAt : !n.readAt);

/** Hub único de notificações: acionáveis ficam em destaque até serem resolvidas. */
export function NotificationBell() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listNotifications);
  const readFn = useServerFn(markNotificationsRead);
  const deleteFn = useServerFn(deleteNotification);
  const { goTo } = useNavigation();
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<NotificationRow | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchFn(),
    refetchInterval: 60_000,
  });
  const markRead = useMutation({
    mutationFn: (ids: string[]) => readFn({ data: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onMutate: (id) =>
      qc.setQueryData<NotificationRow[]>(["notifications"], (old) => old?.filter((n) => n.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const badge = useMemo(() => data.filter(isPending).length, [data]);
  // Todas as não lidas (inclusive acionáveis) — antes só contava informativas, deixando o botão sempre desativado.
  const unreadInfo = data.filter((n) => !n.readAt).map((n) => n.id);

  const openItem = (n: NotificationRow) => {
    if (!n.readAt) markRead.mutate([n.id]);
    setOpen(false);
    if (!n.isActionable || n.resolvedAt) return;
    if (n.type === "policy_not_renewed_pending_reason") setReasonFor(n);
    if (n.type === "access_request") goTo("settings");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full relative" aria-label="Notificações">
            <Bell className="h-4 w-4" />
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 rounded-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-sm font-semibold">Notificações</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={unreadInfo.length === 0}
              onClick={() => markRead.mutate(unreadInfo)}
            >
              Marcar todas como lidas
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma notificação.</p>
            )}
            {data.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group relative border-b border-border last:border-0 hover:bg-muted/50",
                  isPending(n) && "bg-warning/10",
                  !n.readAt && "font-medium",
                )}
              >
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className="w-full text-left px-3 py-2.5 pr-10"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium flex-1">{n.title}</p>
                    {n.isActionable && !n.resolvedAt && (
                      <span className="text-[10px] rounded-full bg-warning/20 text-warning px-1.5 py-0.5">
                        Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">{n.body}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir notificação"
                  className="absolute top-2 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(n.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <PolicyReasonDialog
        open={!!reasonFor}
        onOpenChange={(o) => {
          if (!o) {
            setReasonFor(null);
            void qc.invalidateQueries({ queryKey: ["notifications"] });
          }
        }}
        policyId={reasonFor?.relatedEntityId ?? null}
        policyNumber={reasonFor?.title.replace(/^Apólice | não foi renovada$/g, "")}
        mode="reason"
      />
    </>
  );
}
