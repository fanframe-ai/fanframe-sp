import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, AlertTriangle } from "lucide-react";

interface DeployResult {
  name: string;
  success: boolean;
  error?: string;
}

const EDGE_FUNCTIONS = [
  { name: "generate-tryon", verifyJwt: false },
  { name: "replicate-webhook", verifyJwt: false },
  { name: "health-check", verifyJwt: true },
  { name: "create-first-admin", verifyJwt: false },
  { name: "create-checkout", verifyJwt: false },
];

export default function AdminDeploy() {
  const [projectId, setProjectId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [results, setResults] = useState<DeployResult[]>([]);
  const { toast } = useToast();

  const handleDeploy = async () => {
    if (!projectId.trim() || !accessToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Project ID e o Access Token.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setResults([]);

    try {
      // Call our edge function to do the deploy (bypasses CORS)
      const response = await fetch(
        "https://yxtglwbrdtwmxwrrhroy.supabase.co/functions/v1/deploy-functions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGdsd2JyZHR3bXh3cnJocm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg0NjUsImV4cCI6MjA4NTY1NDQ2NX0.l3VQIroGNVKYmGjfkZ7LNEHq1DuM2hxSo1M-yIuAxE4",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGdsd2JyZHR3bXh3cnJocm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzg0NjUsImV4cCI6MjA4NTY1NDQ2NX0.l3VQIroGNVKYmGjfkZ7LNEHq1DuM2hxSo1M-yIuAxE4",
          },
          body: JSON.stringify({
            projectId,
            accessToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer deploy");
      }

      setResults(data.results || []);

      const { successful, failed } = data.summary || { successful: 0, failed: 0 };

      toast({
        title: "Deploy concluído",
        description: `${successful} sucesso, ${failed} falhas`,
        variant: failed > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      console.error("Deploy error:", error);
      toast({
        title: "Erro no deploy",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Deploy Edge Functions</h1>
          <p className="text-muted-foreground mt-1">
            Faça deploy das Edge Functions para outro projeto Supabase
          </p>
        </div>

        {/* Warning */}
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Importante: Deploy cria funções placeholder
                </p>
                <p className="text-muted-foreground">
                  Este deploy cria as funções com código placeholder. Para copiar o código real,
                  use o script Deno em <code className="bg-muted px-1 rounded">scripts/deploy-edge-functions.ts</code>{" "}
                  ou copie manualmente do dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Credenciais do Supabase
            </CardTitle>
            <CardDescription>
              Insira as credenciais do projeto de destino para fazer o deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                placeholder="ex: yxtglwbrdtwmxwrrhroy"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isDeploying}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Settings → General → Project ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token (Personal)</Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showToken ? "text" : "password"}
                  placeholder="sbp_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isDeploying}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere em:{" "}
                <a
                  href="https://supabase.com/dashboard/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Account Settings → Access Tokens
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !projectId.trim() || !accessToken.trim()}
              className="w-full"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fazendo deploy...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Iniciar Deploy
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Functions List */}
        <Card>
          <CardHeader>
            <CardTitle>Edge Functions</CardTitle>
            <CardDescription>
              Funções que serão criadas/atualizadas no projeto de destino
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {EDGE_FUNCTIONS.map((func) => {
                const result = results.find((r) => r.name === func.name);

                return (
                  <div
                    key={func.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono">{func.name}</code>
                      <Badge variant={func.verifyJwt ? "default" : "secondary"}>
                        JWT: {func.verifyJwt ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDeploying && !result && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {result?.success && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {result && !result.success && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="text-xs text-destructive max-w-[200px] truncate">
                            {result.error}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Copie o código real das funções do projeto original para o novo
              </li>
              <li>
                Configure o secret <code className="bg-muted px-1 rounded">REPLICATE_API_TOKEN</code>{" "}
                nas configurações das Edge Functions
              </li>
              <li>
                Atualize as credenciais no código do frontend (Project ID e Anon Key)
              </li>
              <li>
                Execute a função <code className="bg-muted px-1 rounded">create-first-admin</code>{" "}
                para criar o primeiro administrador
              </li>
              <li>Teste o fluxo completo de geração de imagens</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
