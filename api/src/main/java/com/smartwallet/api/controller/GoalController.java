package com.smartwallet.api.controller;

import com.smartwallet.api.model.Goal;
import com.smartwallet.api.model.GoalHistory;
import com.smartwallet.api.model.Account;
import com.smartwallet.api.repository.GoalRepository;
import com.smartwallet.api.repository.GoalHistoryRepository;
import com.smartwallet.api.repository.AccountRepository;
import com.smartwallet.api.service.GeminiService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
@CrossOrigin(origins = "*")
public class GoalController {

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private GoalHistoryRepository goalHistoryRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private GeminiService geminiService;

    @GetMapping
    public List<Goal> getAll() {
        return goalRepository.findAll();
    }

    @PostMapping
    public Goal create(@RequestBody Goal goal) {
        if (goal.getEmoji() == null || goal.getEmoji().isEmpty()) {
            goal.setEmoji("🎯");
        }
        goal.setAiAdvice("Clique em guardar para receber a primeira dica da IA!");
        return goalRepository.save(goal);
    }

    // 🎯 NOVO ENDPOINT: Devolve o extrato interno exclusivo desse sonho
    @GetMapping("/{id}/history")
    public List<GoalHistory> obterHistoricoSonho(@PathVariable Long id) {
        return goalHistoryRepository.findByGoalIdOrderByDateDesc(id);
    }

    // 🎯 ATUALIZADO: Guardar dinheiro deduzindo do banco físico + histórico + IA do Gemini
    @PostMapping("/{id}/guardar")
    public ResponseEntity<?> guardarDinheiro(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Goal goal = goalRepository.findById(id).orElseThrow(() -> new RuntimeException("Sonho não encontrado"));
            
            // Tratamento dinâmico para evitar problemas de parse de tipos numéricos
            Long accountId = Long.valueOf(payload.get("accountId").toString());
            BigDecimal valor = new BigDecimal(payload.get("amount").toString());
            
            Account conta = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Banco selecionado não encontrado"));

            // Validação de segurança: precisa ter saldo real na conta bancária escolhida
            if (conta.getBalance().compareTo(valor) < 0) {
                return ResponseEntity.badRequest().body("{\"error\":\"Saldo insuficiente no banco selecionado!\"}");
            }

            // 1. Deduz do saldo real da conta bancária
            conta.setBalance(conta.getBalance().subtract(valor));
            accountRepository.save(conta);

            // 2. Incrementa o progresso do sonho
            goal.setCurrentAmount(goal.getCurrentAmount().add(valor));

            // 3. Salva o registro no histórico exclusivo do sonho (Sem gerar Transaction poluidora)
            GoalHistory log = new GoalHistory();
            log.setGoal(goal);
            log.setType("DEPOSITO");
            log.setAmount(valor);
            log.setDate(LocalDate.now());
            log.setBankName(conta.getName());
            goalHistoryRepository.save(log);

            // 4. Aciona a IA do Gemini para gerar o conselho motivacional
            double porcentagem = (goal.getCurrentAmount().doubleValue() / goal.getTargetAmount().doubleValue()) * 100;
            String promptIA = String.format(
                "O usuário está em %.1f%% da meta do sonho '%s %s' (Alvo: R$%.2f, Guardado: R$%.2f). A data limite é %s. Dê uma dica motivacional de finanças de EXATAMENTE 1 linha para ele.",
                porcentagem, goal.getEmoji(), goal.getName(), goal.getTargetAmount(), goal.getCurrentAmount(), goal.getDeadline()
            );
            
            try {
                String conselho = geminiService.interpretarComGemini(promptIA);
                if (conselho.contains("description")) {
                    goal.setAiAdvice("Continue assim! Cada centavo guardado te deixa mais perto do seu objetivo.");
                } else {
                    goal.setAiAdvice(conselho.trim());
                }
            } catch (Exception e) {
                goal.setAiAdvice("Ótimo progresso! Guardando dinheiro com consistência você chega lá antes do prazo.");
            }

            goalRepository.save(goal);
            return ResponseEntity.ok(goal);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // 🎯 ATUALIZADO: Resgatar dinheiro e devolver direto para o banco físico real escolhido
    @PostMapping("/{id}/resgatar")
    public ResponseEntity<?> resgatarDinheiro(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Goal goal = goalRepository.findById(id).orElseThrow(() -> new RuntimeException("Sonho não encontrado"));
            
            Long accountId = Long.valueOf(payload.get("accountId").toString());
            BigDecimal valor = new BigDecimal(payload.get("amount").toString());
            
            Account conta = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Banco selecionado não encontrado"));

            // Validação de segurança: não dá para resgatar mais do que o cofre tem
            if (goal.getCurrentAmount().compareTo(valor) < 0) {
                return ResponseEntity.badRequest().body("{\"error\":\"Saldo insuficiente no cofre do sonho!\"}");
            }

            // 1. Devolve o dinheiro real para a conta bancária escolhida
            conta.setBalance(conta.getBalance().add(valor));
            accountRepository.save(conta);

            // 2. Abate do saldo guardado no sonho
            goal.setCurrentAmount(goal.getCurrentAmount().subtract(valor));

            // 3. Salva o log no histórico exclusivo do sonho
            GoalHistory log = new GoalHistory();
            log.setGoal(goal);
            log.setType("RESGATE");
            log.setAmount(valor);
            log.setDate(LocalDate.now());
            log.setBankName(conta.getName());
            goalHistoryRepository.save(log);

            goalRepository.save(goal);
            return ResponseEntity.ok(goal);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}