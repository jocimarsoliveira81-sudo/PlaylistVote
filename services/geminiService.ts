
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

export const generateSetlistInsight = async (songs: Song[]): Promise<string> => {
  // Use the API key from environment variables
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "Erro: Chave de API não configurada no ambiente.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const songList = songs
    .map(s => `${s.title} (${s.artist}) - Média de Votos: ${
      s.ratings.length > 0 ? (s.ratings.reduce((a, b) => a + b.score, 0) / s.ratings.length).toFixed(1) : 'Sem votos'
    }`)
    .join('\n');

  const prompt = `
    Como um diretor musical experiente de ministério de louvor, analise a seguinte lista de músicas e seus votos da equipe:
    
    ${songList}
    
    Crie uma sugestão curta (2-3 parágrafos) de ordem de setlist para o próximo domingo, focando nas músicas mais votadas e sugerindo uma dinâmica de fluxo (celebração -> adoração). 
    Retorne o texto em português de forma inspiradora.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar sugestões no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o assistente de IA. Verifique se a chave API é válida.";
  }
};
