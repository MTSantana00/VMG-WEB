# VMG SmartWallet 🏦✨

O **VMG SmartWallet** é um ecossistema inteligente de gestão financeira pessoal e teto de gastos. A plataforma une um painel administrativo reativo com inteligência artificial para automação de lançamentos via linguagem natural e importação automatizada de extratos bancários em lote.

---

## 🚀 Funcionalidades Principais

* **VMG Magic ✨**: Sistema de processamento de linguagem natural integrado à API do Gemini para interpretar frases cotidianas (ex: *"Paguei 50 reais no débito do Itaú"*) e transformá-las em lançamentos estruturados automaticamente.
* **Importador de Extratos Inteligente**: Módulo de leitura e processamento de arquivos `.pdf`. Extrai despesas em lote de forma limpa, recalculando o saldo da conta destino selecionada e ignorando entradas para proteção do teto de gastos.
* **Controle Contábil de Cartões**: Gerenciamento de cartões de crédito atrelados a bancos específicos, com travas de segurança baseadas em **Dia de Fechamento** e **Dia de Vencimento** (bloqueia o pagamento da fatura caso o ciclo mensal ainda esteja aberto).
* **Transferências Internas**: Movimentação aritmética manual e assistida entre contas correntes com geração automática de histórico de dupla entrada (linha de receita no destino e despesa na origem).
* **Cofre de Objetivos e Sonhos**: Mapeamento reativo de metas financeiras com acompanhamento de progresso, prazos limites (*deadlines*) e aportes de capital integrados aos saldos dos bancos.
* **Análise Trimestral de 90 Dias**: Consultoria estratégica gerada por IA que analisa o histórico de consumo e faturamento para dar insights de administração financeira.

---

## 🛠️ Tecnologias Utilizadas

### Backend (`/api`)
* **Java 17** / **Spring Boot 3**
* **Spring Data JPA** / **Hibernate**
* **Apache PDFBox** (Processamento e extração de texto de arquivos PDF)
* **Google Gemini API** (Integração com o modelo `gemini-3-flash-preview`)

### Frontend (`/vmg-web`)
* **React 18** / **Next.js 14** (App Router)
* **TypeScript**
* **Tailwind CSS** (Design minimalista e responsivo)
* **Lucide React** (Ícones dinâmicos)

---

## 📦 Como Executar o Projeto Localmente

### Pré-requisitos
* Java 17 instalado
* Node.js (versão 18 ou superior) instalado
* Maven configurado (ou use o wrapper `./mvnw`)

---

### 🗄️ 1. Executando o Backend (Java)

1. Entre no diretório do backend:
   ```bash
   cd api