import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export const StepIndicator = ({ currentStep, totalSteps, labels }: StepIndicatorProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* Progress bar */}
        <div className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-2">
          <div 
            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        {/* Step dots and label */}
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNumber = i + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    isActive && "bg-white scale-125",
                    isCompleted && "bg-white/60",
                    !isActive && !isCompleted && "bg-white/20"
                  )}
                />
                {/* Only show current step label on mobile, all on desktop */}
                {labels && labels[i] && (
                  <span 
                    className={cn(
                      "text-[10px] uppercase tracking-wider transition-all duration-300",
                      "hidden sm:block", // Hide all on mobile by default
                      isActive && "!block text-white font-semibold", // Show current on mobile
                      isCompleted && "text-white/60",
                      !isActive && !isCompleted && "text-white/30"
                    )}
                  >
                    {labels[i]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};