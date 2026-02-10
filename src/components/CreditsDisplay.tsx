import { RefreshCw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditsDisplayProps {
  balance: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const CreditsDisplay = ({ balance, isLoading, onRefresh }: CreditsDisplayProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-border/30 text-sm">
      <div className="flex items-center gap-1.5">
        <Coins className="w-3.5 h-3.5 text-destructive" />
        <span className="font-medium">
          {balance}
        </span>
      </div>
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 touch-target"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
};