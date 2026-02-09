
# 🎵 Playlist Vote - Sistema de Curadoria de Louvor

O **Playlist Vote** é uma plataforma moderna e responsiva projetada para ministérios de louvor e bandas. Ele permite que líderes (admins) cadastrem sugestões de músicas do YouTube para que a equipe possa ouvir, avaliar e votar, facilitando a escolha do repertório com base em dados e feedback coletivo.

## ✨ Funcionalidades

- 🔐 **Sistema de Autenticação**: Acesso restrito para membros da equipe.
- 📺 **Integração com YouTube**: Player embutido para audição direta na plataforma.
- ⭐ **Votação por Estrelas**: Avaliação de 1 a 5 para cada música.
- 📊 **Ranking Inteligente**: No painel admin, as músicas são ordenadas automaticamente pelas mais votadas.
- 👥 **Gestão de Equipe**: Administradores podem cadastrar, gerenciar e remover membros.
- 🤖 **IA Insight (Gemini)**: Assistente musical que analisa as notas e sugere a ordem do setlist (fluxo celebração -> adoração).

## 🚀 Como Executar

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/playlist-vote.git
   ```
2. Configure sua chave de API do Gemini no arquivo `.env`:
   ```env
   API_KEY=sua_chave_aqui
   ```
3. O projeto utiliza import maps, podendo ser executado diretamente em ambientes que suportam ES Modules ou via servidores simples como `npx serve`.

## 🛡️ Credenciais Padrão (Admin)

- **Usuário:** `admin`
- **Senha:** `adminadmin`

## 🛠️ Tecnologias

- **React 19** (vía ESM)
- **Tailwind CSS** (Estilização)
- **Google Gemini API** (IA Musical)
- **LocalStorage API** (Persistência de dados offline-first)
- **FontAwesome** (Ícones)

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
