package com.smartwallet.api.service;

import com.smartwallet.api.model.Account;
import com.smartwallet.api.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    @Autowired
    private AccountRepository accountRepository;

    // 🔒 PROTEÇÃO CONTRA VAZAMENTO: Puxa a chave injetada dinamicamente do ambiente ou properties
    @Value("${gemini.api.key:}")
    private String apiKey;

    /**
     * Interpreta comandos de voz ou texto livre do usuário para gerar transações (JSON)
     */
    @Transactional(readOnly = true)
    public String interpretarComGemini(String fraseUsuario) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); 
        factory.setReadTimeout(5000);    
        
        RestTemplate restTemplate = new RestTemplate(factory);

        // Monta o contexto de bancos reais do usuário para guiar a IA na identificação das contas
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
                "Ano atual de referência do sistema: 2026. Se não houver data explícita, use '2026-05-31'.\n\n" +
                "Hierarquia de Contas ativa:\n" + contextoBancos + "\n\n" +
                "Retorne apenas o JSON puro mapeando as chaves apropriadas.";

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> textPart = Map.of("text", promptSistema + "\n\nFrase do usuário: " + fraseUsuario);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        requestBody.put("contents", List.of(parts));

        Map<String, Object> generationConfig = Map.of("responseMimeType", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String urlCompleta = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + apiKey;

        try {
            if (apiKey == null || apiKey.isEmpty()) throw new RuntimeException("Chave de API do Gemini não configurada.");
            
            ResponseEntity<Map> response = restTemplate.postForEntity(urlCompleta, entity, Map.class);
            List candidates = (List) response.getBody().get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            String text = (String) ((Map) ((List) content.get("parts")).get(0)).get("text");

            return text.replaceAll("(?s).*?\\{", "{")
                       .replaceAll("\\}.*?\\Z", "}")
                       .replace("```json", "")
                       .replace("```", "")
                       .trim();
        } catch (Exception e) {
            return gerarFallbackEstrategico(fraseUsuario, bancosDoUsuario);
        }
    }

    /**
     * Gera uma transação válida estruturada offline caso a API externa falhe ou esteja desconectada
     */
    private String gerarFallbackEstrategico(String fraseUsuario, List<Account> bancosDoUsuario) {
        String fraseMinuscula = fraseUsuario.toLowerCase();
        boolean ehReceita = fraseMinuscula.contains("salario") || fraseMinuscula.contains("recebi") || fraseMinuscula.contains("vendi") || fraseMinuscula.contains("pix de");
        double valorDescoberto = 0.0;
        
        try {
            String fraseTratada = fraseMinuscula.replace(",", ".");
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\d+(\\.\\d+)?");
            java.util.regex.Matcher matcher = pattern.matcher(fraseTratada);
            if (matcher.find()) valorDescoberto = Double.parseDouble(matcher.group());
        } catch (Exception ignored) {}

        String accountJson = "null";
        if (bancosDoUsuario != null && !bancosDoUsuario.isEmpty()) {
            accountJson = "{\"id\":" + bancosDoUsuario.get(0).getId() + "}";
        }

        return String.format(Locale.US,
            "{\"description\":\"%s\",\"amount\":%.2f,\"transactionDate\":\"2026-05-31\",\"type\":\"%s\",\"category\":\"OUTROS\",\"isInstallment\":false,\"installment\":false,\"installmentsCount\":1,\"isRecurring\":false,\"account\":%s,\"card\":null}",
            fraseUsuario.toUpperCase(), valorDescoberto, (ehReceita ? "RECEITA" : "DESPESA"), accountJson
        );
    }

    /**
     * 🎯 METODO CORRIGIDO: URL Limpa sem marcações de Markdown ou links duplicados
     */
    public String gerarConsultoriaTrimestral(String promptSistema) {
        if (apiKey == null || apiKey.isEmpty()) {
            return "❌ Erro VMG: Nova chave de API do Gemini pendente de configuração no ambiente ou application.properties.";
        }
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(50000);
        RestTemplate restTemplate = new RestTemplate(factory);

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> textPart = Map.of("text", promptSistema);
        Map<String, Object> contentsStructure = Map.of("parts", List.of(textPart));
        requestBody.put("contents", List.of(contentsStructure));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        // URL 100% Corrigida e Limpa
        String urlCompleta = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + apiKey;

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(urlCompleta, entity, Map.class);
            List candidates = (List) response.getBody().get("candidates");
            Map content = (Map) ((Map) candidates.get(0)).get("content");
            return (String) ((Map) ((List) content.get("parts")).get(0)).get("text");
        } catch (Exception e) {
            return "⚠️ Não foi possível processar os insights da consultoria inteligente neste momento. Motivo técnico: " + e.getMessage();
        }
    }
}