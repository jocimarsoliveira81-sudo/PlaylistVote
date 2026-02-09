
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

export const generateSetlistInsight = async (songs: Song[]): Promise<string> => {
  // Inicializa o cliente usando a variável de ambiente injetada no build
  // Seguindo as diretrizes: usar process.env.API_KEY diretamente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  if (!process.env.API_KEY || process.env.API_KEY === "") {
    return "⚠️ Chave de API não configurada. Certifique-se de adicionar 'API_KEY' nas variáveis de ambiente da Vercel.";
  }

  if (songs.length === 0) {
    return "Adicione algumas músicas à lista para que eu possa analisar os votos e sugerir um setlist!";
  }
  
  const songList = songs
    .map(s => {
      const avg = s.ratings.length > 0 
        ? (s.ratings.reduce((a, b) => a + b.score, 0) / s.ratings.length).toFixed(1) 
        : 'Sem votos';
      return `- ${s.title} (${s.artist}) | Média: ${avg} | Total de votos: ${s.ratings.length}`;
    })
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise as seguintes músicas e avaliações da nossa equipe de louvor para o próximo domingo:\n\n${songList}`,
      config: {
        systemInstruction: "Você é um diretor musical de igreja experiente e encorajador. Sua tarefa é sugerir uma ordem de setlist baseada na média de votos. Regra de ouro: Comece com 1 ou 2 músicas de celebração (mais rápidas/animadas) e termine com as de adoração profunda (mais lentas). Seja conciso e use um tom inspirador.",
        temperature: 0.7,
      },
    });

    return response.text || "Não foi possível gerar sugestões no momento. Tente novamente em instantes.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes("API key not found") || error?.status === 403) {
      return "Erro: A chave de API configurada é inválida ou expirou. Verifique no Google AI Studio.";
    }
    return "Ocorreu um erro ao conectar com o assistente de IA. Por favor, tente novamente mais tarde.";
  }
};
