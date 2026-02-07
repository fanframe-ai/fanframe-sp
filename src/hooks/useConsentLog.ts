import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_TEXT = `Declaro que sou o titular da imagem ou possuo autorização das pessoas nela presentes, que a imagem não contém conteúdo ilegal, ofensivo ou impróprio, e que será utilizada para gerar uma foto com a camisa oficial do clube. Assumo total responsabilidade por seu uso, isentando a Virtual Fans e o clube, e concordo com o Termo de Uso.`;

export const useConsentLog = () => {
  const logConsent = useCallback(async (userId: string) => {
    try {
      // Get IP address from a public API
      let ipAddress = "unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (e) {
        console.warn("Could not fetch IP address:", e);
      }

      const { error } = await supabase.from("consent_logs").insert({
        user_id: userId,
        consent_type: "image_upload",
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        consent_text: CONSENT_TEXT,
      });

      if (error) {
        console.error("Error logging consent:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in logConsent:", error);
      return false;
    }
  }, []);

  return { logConsent, CONSENT_TEXT };
};
