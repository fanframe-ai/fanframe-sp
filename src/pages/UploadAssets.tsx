import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Check, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ASSETS_TO_UPLOAD = [
  { localPath: "/assets/manto-1.png", storagePath: "shirts/manto-1.png", name: "Manto 1" },
  { localPath: "/assets/manto-2.png", storagePath: "shirts/manto-2.png", name: "Manto 2" },
  { localPath: "/assets/manto-3.png", storagePath: "shirts/manto-3.png", name: "Manto 3" },
  { localPath: "/assets/background.webp", storagePath: "backgrounds/morumbi.webp", name: "Background Morumbi" },
  { localPath: "/assets/background-memorial.jpg", storagePath: "backgrounds/memorial.jpg", name: "Background Memorial" },
  { localPath: "/assets/background-idolos.jpg", storagePath: "backgrounds/idolos.jpg", name: "Background Ídolos" },
  { localPath: "/assets/background-trofeus.jpg", storagePath: "backgrounds/trofeus.jpg", name: "Background Troféus" },
];

type UploadStatus = "pending" | "uploading" | "success" | "error";

interface AssetStatus {
  status: UploadStatus;
  error?: string;
}

export default function UploadAssets() {
  const [statuses, setStatuses] = useState<Record<string, AssetStatus>>({});
  const [isUploading, setIsUploading] = useState(false);

  const updateStatus = (path: string, status: AssetStatus) => {
    setStatuses(prev => ({ ...prev, [path]: status }));
  };

  const uploadAsset = async (localPath: string, storagePath: string) => {
    updateStatus(storagePath, { status: "uploading" });
    
    try {
      // Fetch the asset from the local public folder
      const response = await fetch(localPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${localPath}: ${response.status}`);
      }
      
      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("tryon-assets")
        .upload(storagePath, blob, {
          contentType,
          upsert: true,
        });
      
      if (error) {
        throw error;
      }
      
      updateStatus(storagePath, { status: "success" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      updateStatus(storagePath, { status: "error", error: message });
      return false;
    }
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    let successCount = 0;
    
    for (const asset of ASSETS_TO_UPLOAD) {
      const success = await uploadAsset(asset.localPath, asset.storagePath);
      if (success) successCount++;
    }
    
    setIsUploading(false);
    
    if (successCount === ASSETS_TO_UPLOAD.length) {
      toast.success("Todos os assets foram enviados com sucesso!");
    } else {
      toast.error(`${successCount}/${ASSETS_TO_UPLOAD.length} assets enviados. Verifique os erros.`);
    }
  };

  const getStatusIcon = (storagePath: string) => {
    const status = statuses[storagePath]?.status;
    switch (status) {
      case "uploading":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case "success":
        return <Check className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Upload de Assets</h1>
        <p className="text-muted-foreground">
          Esta página faz upload dos assets locais para o bucket <code className="bg-muted px-1 rounded">tryon-assets</code> no Supabase Storage.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Assets para Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ASSETS_TO_UPLOAD.map((asset) => (
              <div
                key={asset.storagePath}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(asset.storagePath)}
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.localPath} → {asset.storagePath}
                    </p>
                  </div>
                </div>
                {statuses[asset.storagePath]?.error && (
                  <span className="text-xs text-destructive max-w-[200px] truncate">
                    {statuses[asset.storagePath].error}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={handleUploadAll}
          disabled={isUploading}
          size="lg"
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Todos os Assets
            </>
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Após o upload, volte para <a href="/teste" className="text-primary underline">/teste</a> e teste a geração.
        </p>
      </div>
    </div>
  );
}