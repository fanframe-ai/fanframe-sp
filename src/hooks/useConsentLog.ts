import { useCallback } from "react";

const CONSENT_TEXT = `Declaro que sou o titular da imagem ou possuo autorização das pessoas nela presentes, que a imagem não contém conteúdo ilegal, ofensivo ou impróprio, e que será utilizada para gerar uma foto com a camisa oficial do clube. Assumo total responsabilidade por seu uso, isentando a Virtual Fans e o clube, e concordo com o Termo de Uso.`;

export const useConsentLog = () => {
  const logConsent = useCallback(async (_userId: string) => {
    // consent_logs table not available in this project
    console.log("Consent acknowledged for user:", _userId);
    return true;
  }, []);

  return { logConsent, CONSENT_TEXT };
};
