import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EdgeFunction {
  name: string;
  verifyJwt: boolean;
}

const EDGE_FUNCTIONS: EdgeFunction[] = [
  { name: "generate-tryon", verifyJwt: false },
  { name: "replicate-webhook", verifyJwt: false },
  { name: "health-check", verifyJwt: true },
  { name: "create-first-admin", verifyJwt: false },
  { name: "create-checkout", verifyJwt: false },
];

const SUPABASE_API_URL = "https://api.supabase.com";

// Function code templates - these are the actual function codes
const FUNCTION_CODES: Record<string, string> = {
  "generate-tryon": `// Generate TryOn function - placeholder
// The actual code should be fetched from the source project or configured separately
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ message: "generate-tryon placeholder" }), {
    headers: { "Content-Type": "application/json" },
  });
});`,
  "replicate-webhook": `// Replicate Webhook function - placeholder
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ message: "replicate-webhook placeholder" }), {
    headers: { "Content-Type": "application/json" },
  });
});`,
  "health-check": `// Health Check function - placeholder
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});`,
  "create-first-admin": `// Create First Admin function - placeholder
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ message: "create-first-admin placeholder" }), {
    headers: { "Content-Type": "application/json" },
  });
});`,
  "create-checkout": `// Create Checkout function - placeholder
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ message: "create-checkout placeholder" }), {
    headers: { "Content-Type": "application/json" },
  });
});`,
};

async function checkFunctionExists(
  projectId: string,
  accessToken: string,
  functionName: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_API_URL}/v1/projects/${projectId}/functions/${functionName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function createFunction(
  projectId: string,
  accessToken: string,
  functionName: string,
  verifyJwt: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${SUPABASE_API_URL}/v1/projects/${projectId}/functions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: functionName,
          name: functionName,
          verify_jwt: verifyJwt,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deployFunctionCode(
  projectId: string,
  accessToken: string,
  functionName: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create FormData with the code file
    const formData = new FormData();
    const blob = new Blob([code], { type: "application/typescript" });
    formData.append("file", blob, "index.ts");

    const response = await fetch(
      `${SUPABASE_API_URL}/v1/projects/${projectId}/functions/${functionName}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, accessToken, functionCodes } = await req.json();

    if (!projectId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "projectId and accessToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting deploy to project: ${projectId}`);

    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const func of EDGE_FUNCTIONS) {
      console.log(`Processing function: ${func.name}`);

      // Check if function exists
      const exists = await checkFunctionExists(projectId, accessToken, func.name);

      if (!exists) {
        console.log(`Creating function: ${func.name}`);
        const createResult = await createFunction(
          projectId,
          accessToken,
          func.name,
          func.verifyJwt
        );

        if (!createResult.success) {
          results.push({
            name: func.name,
            success: false,
            error: `Failed to create: ${createResult.error}`,
          });
          continue;
        }
      }

      // Get code from request or use placeholder
      const code = functionCodes?.[func.name] || FUNCTION_CODES[func.name];

      console.log(`Deploying code for: ${func.name}`);
      const deployResult = await deployFunctionCode(
        projectId,
        accessToken,
        func.name,
        code
      );

      results.push({
        name: func.name,
        success: deployResult.success,
        error: deployResult.error,
      });
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Deploy completed. Success: ${successful}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: failed === 0,
        results,
        summary: { successful, failed, total: results.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Deploy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
