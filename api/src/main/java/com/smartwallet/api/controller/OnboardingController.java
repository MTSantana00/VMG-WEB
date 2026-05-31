package com.smartwallet.api.controller;

import com.smartwallet.api.dto.OnboardingSetupRequest;
import com.smartwallet.api.model.Account;
import com.smartwallet.api.model.Transaction;
import com.smartwallet.api.model.Goal;
import com.smartwallet.api.repository.AccountRepository;
import com.smartwallet.api.repository.TransactionRepository;
import com.smartwallet.api.repository.GoalRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@CrossOrigin(origins = "*")
public class OnboardingController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private GoalRepository goalRepository;

    private boolean onboardingCompletedStatus = false;
    private String savedUserName = "Matheus";

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of("onboardingCompleted", onboardingCompletedStatus));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        return ResponseEntity.ok(Map.of("name", savedUserName));
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupInicial(@RequestBody OnboardingSetupRequest request) {
        try {
            if (request.getName() != null && !request.getName().trim().isEmpty()) {
                this.savedUserName = request.getName().trim();
            }

            List<Account> contasSalvas = new ArrayList<>();
            Account contaDoSalario = null;

            // 1. Processa e salva a lista de Contas Bancárias
            if (request.getBanks() != null && !request.getBanks().isEmpty()) {
                for (OnboardingSetupRequest.BankSetupDTO bankDTO : request.getBanks()) {
                    Account conta = new Account();
                    String nomeBancoLista = bankDTO.getName().toUpperCase().trim();
                    conta.setName(nomeBancoLista);
                    
                    BigDecimal saldoAcumulado = bankDTO.getInitialBalance() != null ? bankDTO.getInitialBalance() : BigDecimal.ZERO;
                    
                    boolean ehBancoDoSalario = false;
                    if (request.getSalaryBankName() != null) {
                        String nomeBancoSalario = request.getSalaryBankName().toUpperCase().trim();
                        String listaSemAcento = nomeBancoLista.replace("Ú", "U").replace("Á", "A").replace("Í", "I");
                        String salarioSemAcento = nomeBancoSalario.replace("Ú", "U").replace("Á", "A").replace("Í", "I");
                        
                        if (listaSemAcento.contains(salarioSemAcento) || salarioSemAcento.contains(listaSemAcento)) {
                            ehBancoDoSalario = true;
                        }
                    }

                    if (ehBancoDoSalario && request.getSalary() != null) {
                        saldoAcumulado = saldoAcumulado.add(request.getSalary());
                    }
                    
                    conta.setBalance(saldoAcumulado);
                    Account salva = accountRepository.save(conta);
                    contasSalvas.add(salva);

                    if (ehBancoDoSalario) {
                        contaDoSalario = salva;
                    }
                }
            } else {
                Account contaPadrao = new Account();
                contaPadrao.setName("CONTA PRINCIPAL");
                contaPadrao.setBalance(request.getSalary() != null ? request.getSalary() : BigDecimal.ZERO);
                contaDoSalario = accountRepository.save(contaPadrao);
                contasSalvas.add(contaDoSalario);
            }

            // LANÇAMENTO DE RECEITA RECORRENTE AUTOMÁTICA
            if (request.getSalary() != null && request.getSalary().compareTo(BigDecimal.ZERO) > 0) {
                for (int i = 0; i <= 3; i++) {
                    Transaction lancamentoSalario = new Transaction();
                    lancamentoSalario.setDescription("SALÁRIO MENSAL");
                    lancamentoSalario.setAmount(request.getSalary());
                    lancamentoSalario.setType("RECEITA");
                    lancamentoSalario.setCategory("SALARIO");
                    lancamentoSalario.setTransactionDate(LocalDate.now().plusMonths(i));
                    lancamentoSalario.setRecurring(true); 

                    if (contaDoSalario != null) {
                        lancamentoSalario.setAccount(contaDoSalario);
                    } else if (!contasSalvas.isEmpty()) {
                        lancamentoSalario.setAccount(contasSalvas.get(0));
                    }
                    transactionRepository.save(lancamentoSalario);
                }
            }

            // 2. Processa as Despesas
            if (request.getExpenses() != null && !request.getExpenses().isEmpty()) {
                for (OnboardingSetupRequest.ExpenseSetupDTO expenseDTO : request.getExpenses()) {
                    Account contaDestinoGasto = null;
                    if (expenseDTO.getPaymentMethod() != null) {
                        String bancoGastoNormalizado = expenseDTO.getPaymentMethod().toUpperCase().trim();
                        for (Account contaSalva : contasSalvas) {
                            if (contaSalva.getName().contains(bancoGastoNormalizado) || bancoGastoNormalizado.contains(contaSalva.getName())) {
                                contaDestinoGasto = contaSalva;
                                break;
                            }
                        }
                    }
                    if (contaDestinoGasto == null && !contasSalvas.isEmpty()) {
                        contaDestinoGasto = contasSalvas.get(0);
                    }

                    int totalParcelas = (expenseDTO.getInstallment() != null && expenseDTO.getInstallment() && expenseDTO.getInstallmentsCount() != null) 
                                        ? expenseDTO.getInstallmentsCount() : 1;

                    BigDecimal valorParcela = expenseDTO.getAmount().divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);

                    for (int i = 0; i < totalParcelas; i++) {
                        Transaction transacao = new Transaction();
                        if (totalParcelas > 1) {
                            transacao.setDescription(expenseDTO.getDescription().toUpperCase().trim() + " " + (i + 1) + "/" + totalParcelas);
                            transacao.setInstallment(true);
                            transacao.setInstallmentsCount(totalParcelas);
                        } else {
                            transacao.setDescription(expenseDTO.getDescription().toUpperCase().trim());
                            transacao.setInstallment(false);
                            transacao.setInstallmentsCount(1);
                        }

                        transacao.setAmount(valorParcela);
                        transacao.setType("DESPESA");
                        transacao.setCategory("OUTROS");
                        transacao.setTransactionDate(LocalDate.now().plusMonths(i));

                        if (contaDestinoGasto != null) {
                            transacao.setAccount(contaDestinoGasto);
                            if (i == 0) {
                                contaDestinoGasto.setBalance(contaDestinoGasto.getBalance().subtract(valorParcela));
                                accountRepository.save(contaDestinoGasto);
                            }
                        }
                        transactionRepository.save(transacao);
                    }
                }
            }

            // 3. Processa e salva os Objetivos / Sonhos
            if (request.getGoals() != null && !request.getGoals().isEmpty()) {
                for (OnboardingSetupRequest.GoalSetupDTO goalDTO : request.getGoals()) {
                    Goal sonho = new Goal();
                    sonho.setName(goalDTO.getName().toUpperCase().trim());
                    sonho.setTargetAmount(goalDTO.getTarget());
                    sonho.setCurrentAmount(BigDecimal.ZERO);
                    sonho.setEmoji("🎯"); 
                    sonho.setAiAdvice("Clique em guardar para receber a primeira dica da IA!");
                    
                    if (goalDTO.getDeadline() != null && !goalDTO.getDeadline().trim().isEmpty()) {
                        try {
                            sonho.setDeadline(LocalDate.parse(goalDTO.getDeadline().trim()));
                        } catch (Exception e) {
                            sonho.setDeadline(null); 
                        }
                    }
                    
                    goalRepository.save(sonho);
                }
            }

            return ResponseEntity.ok(Map.of(
                "message", "Configurações parciais aplicadas com sucesso!",
                "status", "SUCCESS"
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro: " + e.getMessage()));
        }
    }

    // 🎯 CORREÇÃO DO CRASH: Endpoint exato de conclusão que o Next.js estava chamando e quebrando
    @PostMapping("/complete")
    public ResponseEntity<?> completeOnboarding() {
        this.onboardingCompletedStatus = true;
        return ResponseEntity.ok(Map.of(
            "message", "Onboarding finalizado!",
            "onboardingCompleted", true
        ));
    }
}