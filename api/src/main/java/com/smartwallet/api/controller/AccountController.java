package com.smartwallet.api.controller;

import com.smartwallet.api.dto.TransferRequest;
import com.smartwallet.api.model.Account;
import com.smartwallet.api.model.Card;
import com.smartwallet.api.model.Transaction;
import com.smartwallet.api.repository.AccountRepository;
import com.smartwallet.api.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "*")
public class AccountController {

    @Autowired
    private AccountRepository repository;

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping
    public List<Account> getAllAccounts() {
        List<Account> contas = repository.findAllWithCards();
        LocalDate hoje = LocalDate.now();
        
        for (Account conta : contas) {
            if (conta.getCards() != null) {
                for (Card card : conta.getCards()) {
                    BigDecimal gastos = repository.getFaturaMensalDoCartao(card.getId(), hoje.getMonthValue(), hoje.getYear());
                    card.setInvoiceAmount(gastos != null ? gastos : BigDecimal.ZERO);
                }
            }
        }
        return contas;
    }

    @PostMapping
    public Account saveAccount(@RequestBody Account account) {
        return repository.save(account);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteAccount(@PathVariable Long id) {
        Optional<Account> accOpt = repository.findById(id);
        if (!accOpt.isPresent()) return ResponseEntity.notFound().build();

        Account conta = accOpt.get();
        List<Transaction> txs = transactionRepository.findAll();
        for (Transaction t : txs) {
            if (t.getAccount() != null && t.getAccount().getId().equals(id)) {
                transactionRepository.delete(t);
            }
        }
        repository.delete(conta);
        return ResponseEntity.ok().body("{\"message\": \"Banco removido com sucesso.\"}");
    }

    @PostMapping("/{accountId}/cards/{cardId}/pay-invoice")
    @Transactional
    public ResponseEntity<?> liquidarFaturaCartao(@PathVariable Long accountId, @PathVariable Long cardId) {
        try {
            Account conta = repository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Conta corrente não encontrada"));
            
            Card card = conta.getCards().stream()
                    .filter(c -> c.getId().equals(cardId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Cartão não localizado"));

            LocalDate hoje = LocalDate.now();

            if (card.getClosingDay() != null && hoje.getDayOfMonth() < card.getClosingDay()) {
                return ResponseEntity.badRequest().body("{\"error\": \"FATURA_NAO_FECHADA\", \"closingDay\": " + card.getClosingDay() + "}");
            }
            
            List<Transaction> todasTxs = transactionRepository.findAll();
            boolean jaPago = todasTxs.stream().anyMatch(t -> 
                t.getAccount() != null && t.getAccount().getId().equals(accountId) &&
                ("PAGAMENTO FATURA CARTÃO " + card.getName().toUpperCase()).equals(t.getDescription()) &&
                t.getTransactionDate().getMonthValue() == hoje.getMonthValue() &&
                t.getTransactionDate().getYear() == hoje.getYear()
            );

            if (jaPago) {
                return ResponseEntity.badRequest().body("{\"error\": \"A fatura deste cartão já foi paga este mês!\"}");
            }

            BigDecimal totalFatura = repository.getFaturaMensalDoCartao(cardId, hoje.getMonthValue(), hoje.getYear());

            if (totalFatura == null || totalFatura.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body("{\"error\": \"Nenhuma fatura em aberto encontrada para este mês.\"}");
            }

            conta.setBalance(conta.getBalance().subtract(totalFatura));
            repository.save(conta);

            Transaction lancamentoBanco = new Transaction();
            lancamentoBanco.setDescription("PAGAMENTO FATURA CARTÃO " + card.getName().toUpperCase());
            lancamentoBanco.setAmount(totalFatura);
            lancamentoBanco.setType("DESPESA");
            lancamentoBanco.setCategory("FATURA_PAGA");
            lancamentoBanco.setTransactionDate(hoje);
            lancamentoBanco.setAccount(conta);
            transactionRepository.save(lancamentoBanco);

            for (Transaction t : todasTxs) {
                if (t.getCard() != null && t.getCard().getId().equals(cardId) && 
                    t.getTransactionDate().getMonthValue() == hoje.getMonthValue() && 
                    t.getTransactionDate().getYear() == hoje.getYear()) {
                    t.setCategory("PAGO");
                    transactionRepository.save(t);
                }
            }

            return ResponseEntity.ok("{\"message\": \"Fatura baixada com sucesso!\"}");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    // 🎯 ADICIONADO: Método de Transferência Interna robusto com rollback automático em caso de falhas
    @PostMapping("/transfer")
    @Transactional
    public ResponseEntity<?> realizarTransferenciaInterna(@RequestBody TransferRequest request) {
        try {
            Optional<Account> origemOpt = repository.findByNameIgnoreCase(request.getSourceBank().trim());
            Optional<Account> destinoOpt = repository.findByNameIgnoreCase(request.getTargetBank().trim());

            if (!origemOpt.isPresent() || !destinoOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Bancos inválidos ou não localizados para transferência."));
            }

            Account contaOrigem = origemOpt.get();
            Account contaDestino = destinoOpt.get();

            if (contaOrigem.getBalance().compareTo(request.getAmount()) < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Saldo insuficiente na conta de origem para concluir a operação."));
            }

            // Realiza a movimentação aritmética dos saldos em memória líquida
            contaOrigem.setBalance(contaOrigem.getBalance().subtract(request.getAmount()));
            contaDestino.setBalance(contaDestino.getBalance().add(request.getAmount()));

            repository.save(contaOrigem);
            repository.save(contaDestino);

            // Grava a saída no extrato do banco de Origem
            Transaction txSaida = new Transaction();
            txSaida.setDescription("TRANSFERÊNCIA ENVIADA PARA " + contaDestino.getName());
            txSaida.setAmount(request.getAmount());
            txSaida.setType("DESPESA");
            txSaida.setCategory("TRANSFERENCIA");
            txSaida.setTransactionDate(LocalDate.now());
            txSaida.setAccount(contaOrigem);
            transactionRepository.save(txSaida);

            // Grava a entrada no extrato do banco de Destino
            Transaction txEntrada = new Transaction();
            txEntrada.setDescription("TRANSFERÊNCIA RECEBIDA DE " + contaOrigem.getName());
            txEntrada.setAmount(request.getAmount());
            txEntrada.setType("RECEITA");
            txEntrada.setCategory("TRANSFERENCIA");
            txEntrada.setTransactionDate(LocalDate.now());
            txEntrada.setAccount(contaDestino);
            transactionRepository.save(txEntrada);

            return ResponseEntity.ok(Map.of("message", "Sucesso!"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{accountId}/cards")
    public ResponseEntity<?> salvarOuVincularCartao(@PathVariable Long accountId, @RequestBody Card novoCartao) {
        try {
            Optional<Account> contaOpt = repository.findById(accountId);
            if (!contaOpt.isPresent()) return ResponseEntity.notFound().build();

            Account conta = contaOpt.get();
            if (conta.getCards() == null) conta.setCards(new ArrayList<>());

            if (novoCartao.getId() != null) {
                Card cartaoExistente = conta.getCards().stream()
                        .filter(c -> c.getId().equals(novoCartao.getId()))
                        .findFirst()
                        .orElse(null);

                if (cartaoExistente != null) {
                    cartaoExistente.setCreditLimit(novoCartao.getCreditLimit());
                    cartaoExistente.setAvailableLimit(novoCartao.getCreditLimit()); 
                    cartaoExistente.setClosingDay(novoCartao.getClosingDay());
                    cartaoExistente.setDueDay(novoCartao.getDueDay());
                    if (novoCartao.getName() != null) cartaoExistente.setName(novoCartao.getName());
                    
                    repository.save(conta);
                    return ResponseEntity.ok(cartaoExistente);
                }
            }

            if (novoCartao.getId() == null && novoCartao.getCreditLimit() != null) {
                novoCartao.setAvailableLimit(novoCartao.getCreditLimit());
            }

            novoCartao.setAccount(conta);
            conta.getCards().add(novoCartao);
            repository.save(conta);

            return ResponseEntity.ok(novoCartao);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping("/{accountId}/cards/{cardId}")
    @Transactional
    public ResponseEntity<?> deletarCartao(@PathVariable Long accountId, @PathVariable Long cardId) {
        try {
            Optional<Account> contaOpt = repository.findById(accountId);
            if (!contaOpt.isPresent()) return ResponseEntity.notFound().build();

            Account conta = contaOpt.get();
            if (conta.getCards() != null) {
                List<Transaction> txs = transactionRepository.findAll();
                for (Transaction t : txs) {
                    if (t.getCard() != null && t.getCard().getId().equals(cardId)) {
                        transactionRepository.delete(t);
                    }
                }
                boolean removido = conta.getCards().removeIf(card -> card.getId().equals(cardId));
                if (removido) {
                    repository.save(conta);
                    return ResponseEntity.ok("{\"message\": \"Cartao deletado com sucesso!\"}");
                }
            }
            return ResponseEntity.badRequest().body("{\"error\": \"Cartão não encontrado.\"}");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}