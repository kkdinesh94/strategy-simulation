import { useEffect } from "react";

export function useQuarterPoller(
  universeId: string,
  currentQuarter: number,
  onQuarterAdvanced: (newQuarter: number) => void,
  intervalMs = 30000
): void {
  useEffect(() => {
    if (!universeId) return;

    const poll = () => {
      fetch(`/api/game-state/quarter?universe_id=${encodeURIComponent(universeId)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data && Number(data.quarter) > currentQuarter) {
            onQuarterAdvanced(Number(data.quarter));
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [universeId, currentQuarter, onQuarterAdvanced, intervalMs]);
}
