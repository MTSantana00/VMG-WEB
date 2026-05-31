package com.smartwallet.api.service;

import com.smartwallet.api.model.Account;
import com.smartwallet.api.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    @Autowired
    private AccountRepository accountRepository;

    private final String API_KEY = "AIzaSyDQfnSL_fNUznE7muOdprWzsWGpnjGSEno"; 
    
    // 🎯 URL OFICIAL DO SEU PROJETO RESTAURADA E ADAPTADA
    private final String URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + API_KEY;

    @Transactional(readOnly = true)
    public String interpretarComGemini(String fraseUsuario) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); 
        factory.setReadTimeout(5000);    
        
        RestTemplate restTemplate = new RestTemplate(factory);

        List<Account> bancosDoUsuario = accountRepository.findAll();
        String contextoBancos = "Nenhum banco ou cartão cadastrado ainda no sistema.";
        
        if (bancosDoUsuario != null && !bancosDoUsuario.isEmpty()) {
            contextoBancos = bancosDoUsuario.stream().map(acc -> {
                String cartoesStr = "Nenhum";
                try {
                    if (acc.getCards() != null && !acc.getCards().isEmpty()) {
                        cartoesStr = acc.getCards().stream()
                             .map(c -> "ID: " + c.getId() + " - Nome: " + c.getName())
                             .collect(Collectors.joining(", "));
                    }
                } catch (Exception e) {
                    cartoesStr = "Erro ao carregar cartões";
                }
                return "- BANCO (ID: " + acc.getId() + " - Nome: " + acc.getName() + ") | CARTÕES DE CRÉDITO: [" + cartoesStr + "]";
            }).collect(Collectors.joining("\n"));
        }

        String promptSistema = "Você é um interpretador de dados financeiros especializado em gerar objetos JSON puros.\n" +
                "Ano atual de referência do sistema: 2026. Se não houver data explícita, use '2026-05-19'.\n\n" +
                "Aqui está a lista de BANCOS e CARTÕES de crédito reais do usuário ativos no sistema agora:\n" +
                contextoBancos + "\n\n" +
                "REGRAS CRÍTICAS DE CLASSIFICAÇÃO (TYPE):\n" +
                "1. Se o usuário usar palavras como 'vendi', 'venda', 'desapeguei', 'recebi', 'salário', 'ganhei' ou 'pix de', defina \"type\": \"RECEITA\".\n" +
                "2. Se o usuário usar palavras como 'paguei', 'gastei', 'comprei', 'boleto', defina \"type\": \"DESPESA\".\n" +
                "3. O campo 'amount' deve ser o valor principal inteiro enviado.\n\n" +
                "REGRAS DE VÍNCULO FINANCEIRO (MUITO IMPORTANTE):\n" +
                "A) Se o usuário falar um nome de banco (ex: 'Itaú', 'Santander'), você DEVE usar o ID exato desse banco de acordo com a lista acima no campo \"account\". Nunca invente ou troque por outro banco.\n" +
                "B) Se disser 'CRÉDITO' ou 'CARTÃO' de um banco específico, defina \"card\": {\"id\": ID_DO_CARTAO} e a \"account\": {\"id\": ID_DO_BANCO}.\n" +
                "C) Se falar 'DÉBITO', 'PIX' ou 'PAGUEI NO ITAU' sem citar cartão, vincule APENAS o campo \"account\": {\"id\": ID_DO_ITAÚ} e deixe \"card\": null.\n" +
                "D) Se o usuário não explicitar o banco ou cartão na frase de forma alguma, deixe \"account\": null e \"card\": null para que o usuário reclassifique na interface.\n\n" +
                "Estrutura estrita do JSON esperado:\n" +
                "{\n" +
                "  \"description\": \"Nome limpo do item em maiúsculo\",\n" +
                "  \"amount\": 0.00,\n" +
                "  \"transactionDate\": \"2026-05-19\",\n" +
                "  \"type\": \"DESPESA\" ou \"RECEITA\",\n" +
                "  \"category\": \"OUTROS\",\n" +
                "  \"isInstallment\": false,\n" +
                "  \"installment\": false,\n" +
                "  \"installmentsCount\": 1,\n" +
                "  \"isRecurring\": false,\n" +
                "  \"account\": null ou {\"id\": ID},\n" +
                "  \"card\": null ou {\"id\": ID}\n" +
                "}\n" +
                "Retorne APENAS o JSON válido.";

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> textPart = Map.of("text", promptSistema + "\n\nFrase do usuário: " + fraseUsuario);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        requestBody.put("contents", List.of(parts));

        Map<String, Object> generationConfig = Map.of("responseMimeType", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(URL, entity, Map.class);
            List candidates = (List) response.getBody().get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            String text = (String) ((Map) ((List) content.get("parts")).get(0)).get("text");

            return text.replaceAll("(?s).*?\\{", "{")
                       .replaceAll("\\}.*?\\Z", "}")
                       .replace("```json", "")
                       .replace("```", "")
                       .trim();
        } catch (Exception e) {
            String fraseMinuscula = fraseUsuario.toLowerCase();
            boolean ehRecorrente = fraseMinuscula.contains("mensal") || fraseMinuscula.contains("mes") || fraseMinuscula.contains("assinatura");
            boolean ehParcelado = fraseMinuscula.contains("x") || fraseMinuscula.contains("vezes");
            boolean ehReceita = fraseMinuscula.contains("salario") || fraseMinuscula.contains("recebi") || fraseMinuscula.contains("vendi");
            
            int parcelas = 1;
            double valorDescoberto = 0.0;
            
            try {
                String fraseTratada = fraseMinuscula.replace(",", ".");
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\d+(\\.\\d+)?");
                java.util.regex.Matcher matcher = pattern.matcher(fraseTratada);
                List<String> numerosEncontrados = new ArrayList<>();
                while (matcher.find()) { numerosEncontrados.add(matcher.group()); }
                if (!numerosEncontrados.isEmpty()) valorDescoberto = Double.parseDouble(numerosEncontrados.get(0));
                if (numerosEncontrados.size() > 1 && ehParcelado) parcelas = (int) Double.parseDouble(numerosEncontrados.get(1));
            } catch (Exception ignored) {}

            String accountJson = "null";
            String cardJson = "null";
            
            if (bancosDoUsuario != null) {
                for (Account acc : bancosDoUsuario) {
                    if (fraseMinuscula.contains(acc.getName().toLowerCase().trim())) {
                        accountJson = "{\"id\":" + acc.getId() + "}";
                        if (acc.getCards() != null && (fraseMinuscula.contains("cartao") || fraseMinuscula.contains("crédito") || fraseMinuscula.contains("credito"))) {
                            for (com.smartwallet.api.model.Card card : acc.getCards()) {
                                if (fraseMinuscula.contains(card.getName().toLowerCase().trim()) || card.getName().toLowerCase().contains("itau") || card.getName().toLowerCase().contains("santander")) {
                                    cardJson = "{\"id\":" + card.getId() + "}";
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            }

            return String.format(Locale.US,
                "{\"description\":\"%s\",\"amount\":%.2f,\"transactionDate\":\"2026-05-19\",\"type\":\"%s\",\"category\":\"OUTROS\",\"isInstallment\":%b,\"installment\":%b,\"installmentsCount\":%d,\"isRecurring\":%b,\"account\":%s,\"card\":%s}",
                fraseUsuario.toUpperCase(), valorDescoberto, (ehReceita ? "RECEITA" : "DESPESA"), ehParcelado, ehParcelado, parcelas, ehRecorrente, accountJson, cardJson
            );
        }
    }

    public String gerarConsultoriaTrimestral(String promptSistema) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(15000);
        RestTemplate restTemplate = new RestTemplate(factory);

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", promptSistema);

        Map<String, Object> contentsStructure = new HashMap<>();
        contentsStructure.put("parts", List.of(textPart));
        requestBody.put("contents", List.of(contentsStructure));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(URL, entity, Map.class);
            List candidates = (List) response.getBody().get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            return (String) ((Map) ((List) content.get("parts")).get(0)).get("text");
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 503) {
                return "Os servidores do Gemini 3 Preview estão sob alta demanda temporária. ⏳ Aguarde uns segundinhos e clique no botão novamente.";
            }
            return "Erro retornado pela API do Google (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString();
        } catch (Exception e) {
            e.printStackTrace();
            return "Erro de conexão: Não foi possível estruturar a resposta.";
        }
    }
}