import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, ArrowLeft, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConsentLog } from "@/hooks/useConsentLog";
import { useFanFrameAuth } from "@/hooks/useFanFrameAuth";
import heic2any from "heic2any";

// Formatos suportados pela API OpenAI
const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
// Formatos HEIC do iPhone que serão convertidos
const HEIC_FORMATS = ["image/heic", "image/heif"];
const SUPPORTED_FORMATS_TEXT = "JPG, PNG, WEBP ou HEIC";

interface UploadScreenProps {
  uploadedImage: string | null;
  onImageUpload: (base64: string) => void;
  onClearImage: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export const UploadScreen = ({
  uploadedImage,
  onImageUpload,
  onClearImage,
  onContinue,
  onBack,
}: UploadScreenProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoggingConsent, setIsLoggingConsent] = useState(false);
  const { toast } = useToast();
  const { logConsent, CONSENT_TEXT } = useConsentLog();
  const { getStoredToken } = useFanFrameAuth();

  const convertHeicToJpeg = async (file: File): Promise<Blob> => {
    try {
      const result = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      // heic2any can return an array or a single blob
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      console.error("Error converting HEIC:", error);
      throw new Error("Não foi possível converter a imagem HEIC");
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Check if it's HEIC (by type or extension)
      const isHeic = HEIC_FORMATS.includes(fileType) || 
                     fileName.endsWith(".heic") || 
                     fileName.endsWith(".heif");

      if (isHeic) {
        setIsConverting(true);

        try {
          const convertedBlob = await convertHeicToJpeg(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            onImageUpload(base64);
            setIsConverting(false);
          };
          reader.onerror = () => {
            setIsConverting(false);
            toast({
              title: "Erro na conversão",
              description: "Não foi possível converter a imagem. Tente exportar como JPG.",
              variant: "destructive",
            });
          };
          reader.readAsDataURL(convertedBlob);
        } catch (error) {
          setIsConverting(false);
          toast({
            title: "Erro na conversão",
            description: "Não foi possível converter a imagem HEIC. Tente exportar como JPG nas configurações do iPhone.",
            variant: "destructive",
          });
        }
        return;
      }

      // Check if it's a supported format
      if (!SUPPORTED_FORMATS.includes(fileType)) {
        const formatName = fileType.split("/")[1]?.toUpperCase() || "desconhecido";
        toast({
          title: "Formato não suportado",
          description: `O formato ${formatName} não é aceito. Use apenas ${SUPPORTED_FORMATS_TEXT}.`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onImageUpload(base64);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-4 pt-16 safe-bottom">
      {/* Header */}
      <div className="text-center mb-3 sm:mb-6 animate-fade-in">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-1 sm:mb-2 uppercase tracking-tight">
          Agora, sua foto
        </h2>
        <p className="text-muted-foreground text-xs sm:text-lg">
          Corpo inteiro, roupa clara
        </p>
      </div>

      {/* Upload Area */}
      <div className="w-full max-w-md mb-4 sm:mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {isConverting ? (
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
            <p className="text-sm text-muted-foreground">Processando imagem...</p>
          </div>
        ) : uploadedImage ? (
          <div className="relative glass-card p-3 sm:p-4 rounded-2xl">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
              <img
                src={uploadedImage}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={onClearImage}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur flex items-center justify-center hover:bg-black transition-colors touch-target"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
              Foto selecionada! Bora vestir o manto.
            </p>
          </div>
        ) : (
          <label
            className={cn(
              "block glass-card p-6 sm:p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/10 touch-active",
              isDragging && "border-white bg-white/10"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleInputChange}
            />
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                {isDragging ? (
                  <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                ) : (
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </div>
              <p className="text-base sm:text-lg font-semibold mb-1">
                {isDragging ? "SOLTA AÍ!" : "ESCOLHER FOTO"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {SUPPORTED_FORMATS_TEXT} • Corpo inteiro
              </p>
            </div>
          </label>
        )}
      </div>

      {/* Consent Checkbox - Only show when image is uploaded */}
      {uploadedImage && !isConverting && (
        <div className="w-full max-w-md mb-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card p-4 sm:p-5 rounded-xl">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={hasConsented}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    setIsLoggingConsent(true);
                    const token = getStoredToken();
                    const userId = token || `anonymous_${Date.now()}`;
                    await logConsent(userId);
                    setIsLoggingConsent(false);
                  }
                  setHasConsented(checked === true);
                }}
                disabled={isLoggingConsent}
                className="mt-1 h-5 w-5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
              />
              <label
                htmlFor="consent"
                className="text-xs sm:text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                Declaro que sou o titular da imagem ou possuo autorização das pessoas nela presentes, que a imagem não contém conteúdo ilegal, ofensivo ou impróprio, e que será utilizada para gerar uma foto com a camisa oficial do clube. Assumo total responsabilidade por seu uso, isentando a Virtual Fans e o clube, e concordo com o{" "}
                <a
                  href="/termos-de-uso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-white/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Termo de Uso
                </a>
                .
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {!uploadedImage && !isConverting && (
        <div className="w-full max-w-md mb-6 sm:mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card p-4 sm:p-5 rounded-xl">
            <h4 className="font-bold text-xs sm:text-sm uppercase mb-2 sm:mb-3">Dicas para melhor resultado</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>• Foto de corpo inteiro, de frente</li>
              <li>• Roupa clara funciona melhor</li>
              <li>• Boa iluminação ajuda demais</li>
            </ul>
          </div>
        </div>
      )}

      {/* CTAs - Stack on mobile */}
      <div className="flex flex-col gap-3 w-full max-w-md px-0 animate-fade-in mt-auto" style={{ animationDelay: "0.3s" }}>
        <Button
          onClick={onContinue}
          disabled={!uploadedImage || isConverting || !hasConsented || isLoggingConsent}
          size="lg"
          className="btn-mobile-cta bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 order-1"
        >
          {isLoggingConsent ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              PROCESSANDO...
            </>
          ) : (
            "VESTIR O MANTO"
          )}
        </Button>
        <Button
          onClick={onBack}
          size="lg"
          variant="outline"
          disabled={isConverting || isLoggingConsent}
          className="btn-mobile border-white/30 hover:bg-white/10 transition-all order-2"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          VOLTAR
        </Button>
      </div>
    </div>
  );
};
