import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASSET_URLS, BACKGROUNDS, type Background } from "@/config/fanframe";

export interface Shirt {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;      // For display in the UI (local path)
  assetPath: string;     // For API calls (public asset path for cache optimization)
  promptDescription: string;
}

export const SHIRTS: Shirt[] = [
  {
    id: "manto-1",
    name: "Manto I – O Soberano",
    subtitle: "O clássico tricolor que carrega a história",
    imageUrl: ASSET_URLS.shirts["manto-1"],
    assetPath: ASSET_URLS.shirts["manto-1"],
    promptDescription: "white São Paulo FC soccer jersey with red and black horizontal stripes, New Balance logo on chest, São Paulo team crest in center, classic tricolor design",
  },
  {
    id: "manto-2",
    name: "Manto II – Tricolor Paulista",
    subtitle: "A força que vem da torcida",
    imageUrl: ASSET_URLS.shirts["manto-2"],
    assetPath: ASSET_URLS.shirts["manto-2"],
    promptDescription: "red São Paulo FC away soccer jersey with white and black accents, New Balance logo on chest, São Paulo team crest in center",
  },
  {
    id: "manto-3",
    name: "Manto III – O Mais Querido",
    subtitle: "Atitude e paixão tricolor",
    imageUrl: ASSET_URLS.shirts["manto-3"],
    assetPath: ASSET_URLS.shirts["manto-3"],
    promptDescription: "black São Paulo FC third jersey with red and white details, New Balance logo on chest, São Paulo team crest",
  },
];

export { type Background };

interface ShirtSelectionScreenProps {
  selectedShirt: Shirt | null;
  onSelectShirt: (shirt: Shirt) => void;
  selectedBackground: Background | null;
  onSelectBackground: (background: Background) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const ShirtSelectionScreen = ({
  selectedShirt,
  onSelectShirt,
  selectedBackground,
  onSelectBackground,
  onContinue,
  onBack,
}: ShirtSelectionScreenProps) => {
  const canContinue = selectedShirt !== null && selectedBackground !== null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 pt-20 safe-bottom">
      {/* Shirt Selection */}
      <div className="text-center mb-4 sm:mb-6 animate-fade-in">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 sm:mb-2 uppercase tracking-tight px-2">
          Qual manto você vai vestir?
        </h2>
      </div>

      <div className="w-full max-w-lg grid grid-cols-1 gap-2 sm:gap-3 mb-6 sm:mb-8">
        {SHIRTS.map((shirt, index) => {
          const isSelected = selectedShirt?.id === shirt.id;
          return (
            <button
              key={shirt.id}
              onClick={() => onSelectShirt(shirt)}
              className={cn(
                "relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 animate-fade-in text-left touch-active",
                isSelected ? "glass-card-selected scale-[1.02]" : "glass-card hover:bg-white/10"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white">
                  <img
                    src={shirt.imageUrl}
                    alt={shirt.name}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base uppercase mb-0.5 truncate">{shirt.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {shirt.subtitle}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-white border-white" : "border-white/30"
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Background Selection */}
      <div className="text-center mb-4 sm:mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 sm:mb-2 uppercase tracking-tight px-2">
          Escolha o cenário
        </h2>
      </div>

      <div className="w-full max-w-lg grid grid-cols-1 gap-2 sm:gap-3 mb-8 sm:mb-10">
        {BACKGROUNDS.map((background, index) => {
          const isSelected = selectedBackground?.id === background.id;
          return (
            <button
              key={background.id}
              onClick={() => onSelectBackground(background)}
              className={cn(
                "relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 animate-fade-in text-left touch-active",
                isSelected ? "glass-card-selected scale-[1.02]" : "glass-card hover:bg-white/10"
              )}
              style={{ animationDelay: `${(index + 3) * 0.1}s` }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative flex-shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={background.imageUrl}
                    alt={background.name}
                    width={96}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base uppercase mb-0.5 truncate">{background.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {background.subtitle}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-white border-white" : "border-white/30"
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-md px-4 sm:px-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          size="lg"
          className="btn-mobile-cta bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 order-1"
        >
          Continuar
        </Button>
        <Button
          onClick={onBack}
          size="lg"
          variant="outline"
          className="btn-mobile border-white/30 hover:bg-white/10 transition-all order-2"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          VOLTAR
        </Button>
      </div>
    </div>
  );
};
