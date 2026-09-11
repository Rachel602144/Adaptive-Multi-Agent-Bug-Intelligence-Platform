import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={1.6} />
      <p className="text-sm font-medium text-red-400">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
