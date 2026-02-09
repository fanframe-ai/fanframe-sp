import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ASSET_URLS } from "@/config/fanframe";

const shirts = [
  { id: "manto-1", name: "Manto 1", src: ASSET_URLS.shirts["manto-1"] },
  { id: "manto-2", name: "Manto 2", src: ASSET_URLS.shirts["manto-2"] },
  { id: "manto-3", name: "Manto 3", src: ASSET_URLS.shirts["manto-3"] },
];

const backgrounds = [
  { id: "idolos", name: "Ídolos", src: ASSET_URLS.backgrounds["idolos"] },
  { id: "memorial", name: "Memorial", src: ASSET_URLS.backgrounds["memorial"] },
  { id: "trofeus", name: "Troféus", src: ASSET_URLS.backgrounds["trofeus"] },
];

export default function Teste() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedShirt, setSelectedShirt] = useState(shirts[0]);
  const [selectedBg, setSelectedBg] = useState(backgrounds[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUserImage(base64);
      addLog(`Imagem carregada: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!userImage) {
      toast.error("Selecione uma foto primeiro");
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    addLog("Iniciando geração...");

    try {
      // URLs are already absolute from Supabase Storage
      const shirtAssetUrl = selectedShirt.src;
      const backgroundAssetUrl = selectedBg.src;

      addLog(`Camisa: ${selectedShirt.id}`);
      addLog(`Background: ${selectedBg.id}`);
      addLog(`Shirt URL: ${shirtAssetUrl}`);
      addLog("Chamando Edge Function...");

      const startTime = Date.now();

      // Use fetch directly to get full error response body
      const response = await fetch(
        "https://yxtglwbrdtwmxwrrhroy.supabase.co/functions/v1/generate-tryon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGdsd2JyZHR3bXh3cnJocm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg0NjUsImV4cCI6MjA4NTY1NDQ2NX0.l3VQIroGNVKYmGjfkZ7LNEHq1DuM2hxSo1M-yIuAxE4",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGdsd2JyZHR3bXh3cnJocm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg0NjUsImV4cCI6MjA4NTY1NDQ2NX0.l3VQIroGNVKYmGjfkZ7LNEHq1DuM2hxSo1M-yIuAxE4",
          },
          body: JSON.stringify({
            userImageBase64: userImage,
            shirtAssetUrl,
            backgroundAssetUrl,
            shirtId: selectedShirt.id,
            userId: "test-user",
          }),
        }
      );

      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) {
        addLog(`❌ Erro HTTP ${response.status}`);
        addLog(`Resposta completa: ${JSON.stringify(data, null, 2)}`);
        toast.error(`Erro: ${data.error || response.statusText}`);
        return;
      }

      if (data?.error) {
        addLog(`❌ Erro da API: ${data.error}`);
        addLog(`Stage: ${data.stage || "unknown"}`);
        toast.error(`Erro: ${data.error}`);
        return;
      }

      if (data?.generatedImage) {
        addLog(`✅ Sucesso direto! Tempo: ${elapsed}s`);
        setGeneratedImage(data.generatedImage);
        toast.success("Imagem gerada com sucesso!");
      } else if (data?.queueId) {
        addLog(`⏳ Geração iniciada na fila: ${data.queueId}`);
        addLog(`Prediction: ${data.predictionId}`);
        addLog("Aguardando resultado via polling...");
        
        // Poll the queue for result
        const queueId = data.queueId;
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 3000));
          
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            "https://nosobqpiqhskkcfefbuw.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vc29icXBpcWhza2tjZmVmYnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDgzOTEsImV4cCI6MjA4NTkyNDM5MX0.WDUVbxOMNWKaG1pJ8iSf-FLWaSgWgKjnrFfxzMaJvqg"
          );
          
          const { data: queue } = await supabase
            .from("generation_queue")
            .select("status, result_image_url, error_message")
            .eq("id", queueId)
            .single();
          
          if (!queue) {
            addLog(`❌ Fila não encontrada`);
            break;
          }
          
          if (queue.status === "completed" && queue.result_image_url) {
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            addLog(`✅ Sucesso! Tempo total: ${totalTime}s`);
            setGeneratedImage(queue.result_image_url);
            toast.success("Imagem gerada com sucesso!");
            break;
          } else if (queue.status === "failed") {
            addLog(`❌ Falhou: ${queue.error_message}`);
            toast.error(`Erro: ${queue.error_message}`);
            break;
          } else {
            if (i % 5 === 0) addLog(`⏳ Polling... status: ${queue.status} (${i * 3}s)`);
          }
        }
      } else {
        addLog(`⚠️ Resposta inesperada: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      addLog(`❌ Exceção: ${message}`);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Página de Teste - Geração</h1>
        <p className="text-muted-foreground">
          Teste a geração de imagens sem restrições de acesso ou créditos.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-4">
            {/* User Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Foto do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mb-4"
                />
                {userImage && (
                  <img
                    src={userImage}
                    alt="Preview"
                    className="w-full max-w-xs rounded-lg border"
                  />
                )}
              </CardContent>
            </Card>

            {/* Shirt Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Camisa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {shirts.map((shirt) => (
                    <button
                      key={shirt.id}
                      onClick={() => {
                        setSelectedShirt(shirt);
                        addLog(`Camisa selecionada: ${shirt.id}`);
                      }}
                      className={`p-2 border-2 rounded-lg transition-all ${
                        selectedShirt.id === shirt.id
                          ? "border-primary ring-2 ring-primary/50"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={shirt.src} alt={shirt.name} className="w-16 h-16 object-contain" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Background Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Background</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        setSelectedBg(bg);
                        addLog(`Background selecionado: ${bg.id}`);
                      }}
                      className={`p-2 border-2 rounded-lg transition-all ${
                        selectedBg.id === bg.id
                          ? "border-primary ring-2 ring-primary/50"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={bg.src} alt={bg.name} className="w-20 h-12 object-cover rounded" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!userImage || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Gerar Imagem
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            {/* Generated Image */}
            <Card>
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                    {isGenerating ? "Gerando..." : "Aguardando geração..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Logs
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogs([])}
                  >
                    Limpar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono text-xs p-3 rounded-lg h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <span className="text-gray-500">Nenhum log ainda...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
