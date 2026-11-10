import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

/** Miniatura clicável que abre a imagem em tela cheia com zoom, sem download. */
export function ImageThumb({ src, name }: { src: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const clamp = (z: number) => Math.min(5, Math.max(0.25, z));
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(1);
          setOpen(true);
        }}
        className="block overflow-hidden rounded-lg border border-border bg-muted hover:opacity-90"
        title={name}
      >
        <img src={src} alt={name} className="h-24 max-w-[180px] object-cover" loading="lazy" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <div className="flex items-center gap-1 border-b border-border px-3 py-2 pr-12">
            <DialogTitle className="flex-1 truncate text-sm font-medium">{name}</DialogTitle>
            <Button size="icon" variant="ghost" aria-label="Diminuir zoom" onClick={() => setZoom((z) => clamp(z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" aria-label="Aumentar zoom" onClick={() => setZoom((z) => clamp(z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Restaurar zoom" onClick={() => setZoom(1)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="flex-1 overflow-auto bg-muted/40"
            onWheel={(e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.1 : -0.1)));
            }}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              <img
                src={src}
                alt={name}
                style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
                className="h-auto object-contain"
                draggable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
