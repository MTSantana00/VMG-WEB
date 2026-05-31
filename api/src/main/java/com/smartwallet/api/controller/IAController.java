package com.smartwallet.api.controller;

import com.smartwallet.api.model.Transaction;
import com.smartwallet.api.repository.TransactionRepository;
import com.smartwallet.api.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ia")
@CrossOrigin(origins = "*")
public class IAController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private TransactionRepository transactionRepository;

    @PostMapping("/interpretar")
    public ResponseEntity<?> interpretarComando(@RequestBody Map<String, String> payload) {
        try {
            String fraseUsuario = payload.get("frase");
            String jsonResposta = geminiService.interpretarComGemini(fraseUsuario);
            return ResponseEntity.ok(jsonResposta);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/resumo-trimestral")
    public ResponseEntity<?> obterResumoTrimestral() {
        try {
            LocalDate limiteTrimestre = LocalDate.now().minusMonths(3);

            // 🎯 OTIMIZAÇÃO: Traz do banco apenas o escopo necessário em vez de carregar a tabela inteira
            List<Transaction> txsTrimestre = transactionRepository.findTransactionsDosUltimosMeses(limiteTrimestre);

            if (txsTrimestre.isEmpty()) {
                return ResponseEntity.ok(Map.of("analise", "Ainda não tenho dados históricos suficientes dos últimos 3 meses para gerar um diagnóstico preciso. Continue lançando seus gastos!"));
            }

            BigDecimal totalReceitas = txsTrimestre.stream()
                .filter(t -> "RECEITA".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalDespesas = txsTrimestre.stream()
                .filter(t -> "DESPESA".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, BigDecimal> despesasPorCategoria = txsTrimestre.stream()
                .filter(t -> "DESPESA".equals(t.getType()))
                .collect(Collectors.groupingBy(
                    t -> t.getCategory() != null ? t.getCategory() : "OUTROS",
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

            String promptConsultoria = "Você é um consultor financeiro focado em fazer pessoas saírem do ciclo de apenas pagar contas. " +
                "Analise esse panorama real de 3 meses: " +
                "Receitas no Trimestre: R$ " + totalReceitas + ". " +
                "Despesas no Trimestre: R$ " + totalDespesas + ". " +
                "Gastos por Categoria: " + despesasPorCategoria.toString() + ". " +
                "Gere um feedback estruturado usando markdown contendo: Diagnóstico, Onde Cortar Gordura, e Estratégia de Poupança (Regra 50/30/20). Seja direto e motivador.";

            String analiseGemini = geminiService.gerarConsultoriaTrimestral(promptConsultoria);
            return ResponseEntity.ok(Map.of("analise", analiseGemini));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}