import { useEffect, useState } from "react";

/** Força re-render a cada `intervalMs` para atualizar contagens regressivas de SLA. */
export function useSlaTicker(intervalMs = 60_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
