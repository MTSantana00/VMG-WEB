package com.smartwallet.api.controller;

import com.smartwallet.api.model.Transaction;
import com.smartwallet.api.model.Account;
import com.smartwallet.api.model.Card;
import com.smartwallet.api.repository.TransactionRepository;
import com.smartwallet.api.repository.AccountRepository;
import com.smartwallet.api.repository.CardRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CardRepository cardRepository;

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return repository.findAll();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> saveTransaction(@RequestBody Transaction transaction, @RequestParam(value = "force", defaultValue = "false") boolean force) {
        try {
            String desc = transaction.getDescription() != null ? transaction.getDescription().toUpperCase().trim() : "";
            LocalDate hoje = LocalDate.now();
            
            Pattern regexValorIsolado = Pattern.compile("(?<!\\w)(?:R\\$\\s*)?(\\d+(?:\\.\\d{3})*(?:,\\d{2})?)(?!\\w)");
            Matcher matcher = regexValorIsolado.matcher(desc);
            if (matcher.find()) {
                String numeroLimpo = matcher.group(1).replace(".", "").replace(",", ".");
                transaction.setAmount(new BigDecimal(numeroLimpo));
            }

            Pattern regexParcelas = Pattern.compile("\\b(\\d+)\\s*(?:X|PARCELAS|VEZES)\\b");
            Matcher matcherParcelas = regexParcelas.matcher(desc);
            int totalParcelas = 1;
            if (matcherParcelas.find()) {
                transaction.setInstallment(true);
                totalParcelas = Integer.parseInt(matcherParcelas.group(1));
                transaction.setInstallmentsCount(totalParcelas);
            } else if (transaction.isInstallment() && transaction.getInstallmentsCount() != null) {
                totalParcelas = transaction.getInstallmentsCount();
            }

            Account conta = null;
            if (transaction.getAccount() != null && transaction.getAccount().getId() != null) {
                conta = accountRepository.findById(transaction.getAccount().getId()).orElse(null);
            }

            Card cartaoVinculado = null;
            if (transaction.getCard() != null && transaction.getCard().getId() != null) {
                cartaoVinculado = cardRepository.findById(transaction.getCard().getId()).orElse(null);
            }

            // Garante o vínculo correto de árvore
            transaction.setAccount(conta);
            transaction.setCard(cartaoVinculado);

            BigDecimal valorDaParcelaMes = transaction.getAmount();
            if (transaction.isInstallment() && totalParcelas > 1) {
                valorDaParcelaMes = transaction.getAmount().divide(BigDecimal.valueOf(totalParcelas), 2, RoundingMode.HALF_UP);
            }

            // Validação de limite disponível do cartão
            if ("DESPESA".equals(transaction.getType()) && cartaoVinculado != null && !force) {
                BigDecimal faturaMesAtual = accountRepository.getFaturaMensalDoCartao(cartaoVinculado.getId(), hoje.getMonthValue(), hoje.getYear());
                BigDecimal limiteDisponivel = cartaoVinculado.getCreditLimit().subtract(faturaMesAtual != null ? faturaMesAtual : BigDecimal.ZERO);

                if (valorDaParcelaMes.compareTo(limiteDisponivel) > 0) {
                    BigDecimal diferenca = valorDaParcelaMes.subtract(limiteDisponivel.max(BigDecimal.ZERO));
                    BigDecimal sugestaoUpgrade = cartaoVinculado.getCreditLimit().add(diferenca);

                    return ResponseEntity.status(422).body(Map.of(
                        "error", "LIMITE_EXCEDIDO",
                        "nomeCartao", cartaoVinculado.getName(),
                        "limiteDisponivel", limiteDisponivel.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : limiteDisponivel,
                        "valorTentado", valorDaParcelaMes,
                        "sugestao", sugestaoUpgrade.setScale(0, RoundingMode.CEILING),
                        "payloadOriginal", transaction
                    ));
                }
            }

            // Gravação fracionada no banco de dados
            if (transaction.isInstallment() && totalParcelas > 1) {
                LocalDate dataBase = transaction.getTransactionDate() != null ? transaction.getTransactionDate() : LocalDate.now();
                String descricaoLimpa = desc.replaceAll("\\b\\d+([.,]\\d+)?\\b", "").replaceAll("\\b\\d+\\s*(X|PARCELAS|VEZES)\\b", "").replaceAll("\\s+", " ").trim();

                for (int i = 0; i < totalParcelas; i++) {
                    Transaction tParcela = new Transaction();
                    // Exibe o nome limpo com a indicação exata da parcela corrente na listagem
                    tParcela.setDescription(descricaoLimpa + " (PARCELA " + (i + 1) + "/" + totalParcelas + ")");
                    tParcela.setAmount(valorDaParcelaMes);
                    tParcela.setType("DESPESA");
                    tParcela.setCategory("EM_ABERTO"); 
                    tParcela.setTransactionDate(dataBase.plusMonths(i));
                    tParcela.setInstallment(true);
                    tParcela.setInstallmentsCount(totalParcelas);
                    tParcela.setAccount(conta);
                    tParcela.setCard(cartaoVinculado);
                    
                    repository.save(tParcela);
                }
                return ResponseEntity.ok().body("{\"message\": \"Sucesso!\"}");
            } else {
                // 🎯 RECONCILIAÇÃO DE SALDO: Se tiver cartão atrelado, NÃO mexe no saldo à vista da conta bancária!
                if (conta != null && cartaoVinculado == null) {
                    if ("DESPESA".equals(transaction.getType())) {
                        conta.setBalance(conta.getBalance().subtract(transaction.getAmount()));
                    } else if ("RECEITA".equals(transaction.getType())) {
                        conta.setBalance(conta.getBalance().add(transaction.getAmount()));
                    }
                    accountRepository.save(conta);
                }
                return ResponseEntity.ok(repository.save(transaction));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @RequestBody Transaction transactionDetails) {
        Optional<Transaction> transactionOpt = repository.findById(id);
        if (!transactionOpt.isPresent()) return ResponseEntity.notFound().build();
        
        Transaction transaction = transactionOpt.get();
        
        // Estorno seguro
        if (transaction.getCard() == null && transaction.getAccount() != null) {
            Account contaAntiga = transaction.getAccount();
            if ("DESPESA".equals(transaction.getType())) {
                contaAntiga.setBalance(contaAntiga.getBalance().add(transaction.getAmount()));
            } else if ("RECEITA".equals(transaction.getType())) {
                contaAntiga.setBalance(contaAntiga.getBalance().subtract(transaction.getAmount()));
            }
            accountRepository.save(contaAntiga);
        }

        Account novaConta = null;
        if (transactionDetails.getAccount() != null && transactionDetails.getAccount().getId() != null) {
            novaConta = accountRepository.findById(transactionDetails.getAccount().getId()).orElse(null);
        }
        transaction.setAccount(novaConta);

        Card novoCartao = null;
        if (transactionDetails.getCard() != null && transactionDetails.getCard().getId() != null) {
            novoCartao = cardRepository.findById(transactionDetails.getCard().getId()).orElse(null);
            transaction.setCard(novoCartao);
            transaction.setCategory("EM_ABERTO"); 
        } else {
            transaction.setCard(null);
            if (transactionDetails.getCategory() != null) {
                transaction.setCategory(transactionDetails.getCategory());
            }
        }

        transaction.setDescription(transactionDetails.getDescription().toUpperCase());
        transaction.setAmount(transactionDetails.getAmount());
        transaction.setTransactionDate(transactionDetails.getTransactionDate());
        transaction.setType(transactionDetails.getType());

        // Aplica o novo saldo se for movimentação à vista
        if (novoCartao == null && novaConta != null) {
            if ("DESPESA".equals(transaction.getType())) {
                novaConta.setBalance(novaConta.getBalance().subtract(transaction.getAmount()));
            } else if ("RECEITA".equals(transaction.getType())) {
                novaConta.setBalance(novaConta.getBalance().add(transaction.getAmount()));
            }
            accountRepository.save(novaConta);
        }
        
        return ResponseEntity.ok(repository.save(transaction));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id) {
        Optional<Transaction> txOpt = repository.findById(id);
        if (!txOpt.isPresent()) return ResponseEntity.notFound().build();
        
        Transaction tx = txOpt.get();
        if (tx.getCard() == null && tx.getAccount() != null) {
            Account conta = tx.getAccount();
            if ("DESPESA".equals(tx.getType())) {
                conta.setBalance(conta.getBalance().add(tx.getAmount()));
            } else if ("RECEITA".equals(tx.getType())) {
                conta.setBalance(conta.getBalance().subtract(tx.getAmount()));
            }
            accountRepository.save(conta);
        }
        
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> statusUpdate) {
        Optional<Transaction> transactionOpt = repository.findById(id);
        if (!transactionOpt.isPresent()) return ResponseEntity.notFound().build();
        
        Transaction transaction = transactionOpt.get();
        if (statusUpdate.containsKey("category")) {
            String novoStatus = statusUpdate.get("category").toUpperCase();
            if ("PAGO".equals(transaction.getCategory()) && "PAGO".equals(novoStatus)) {
                return ResponseEntity.status(400).body("{\"error\": \"JA_PAGO\"}");
            }
            transaction.setCategory(novoStatus);
        }
        repository.save(transaction);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/importar-extrato")
    @Transactional
    public ResponseEntity<?> importarExtrato(@RequestParam("file") MultipartFile file, @RequestParam("accountId") Long accountId) {
        try {
            if (file.isEmpty()) return ResponseEntity.badRequest().body("{\"error\": \"Arquivo vazio.\"}");

            Account contaAlvo = accountRepository.findById(accountId)
                    .orElseThrow(() -> new RuntimeException("Conta destino não localizada."));

            List<String> linhas = extrairLinhasTextoPdf(file);
            List<Transaction> transacoesValidas = new ArrayList<>();
            BigDecimal totalParaDeduzirDoBanco = BigDecimal.ZERO;

            DateTimeFormatter formatoLongo = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter formatoCurto = DateTimeFormatter.ofPattern("dd/MM/yy");
            Pattern regexData = Pattern.compile("\\b\\d{2}/\\d{2}/\\d{2,4}\\b");
            Pattern regexValor = Pattern.compile("-?\\b\\d+([.\\s]?\\d*)*([.,]\\d{2})\\b");

            for (String linha : linhas) {
                String linhaUpper = linha.toUpperCase().trim();
                if (linhaUpper.contains("SALDO")) continue;

                Matcher matcherData = regexData.matcher(linha);
                Matcher matcherValor = regexValor.matcher(linha);

                if (matcherData.find() && matcherValor.find()) {
                    String dataStr = matcherData.group().trim();
                    String valorStr = matcherValor.group().trim();

                    // Filtro rígido: Ignora qualquer linha de crédito/entrada (PIX recebido, depósitos, etc.)
                    if (!valorStr.startsWith("-")) continue;

                    String descricaoStr = linha.replace(dataStr, "").replace(valorStr, "").replaceAll("\\s+", " ").trim().toUpperCase();

                    try {
                        LocalDate dataTransacao = dataStr.length() == 10 ? LocalDate.parse(dataStr, formatoLongo) : LocalDate.parse(dataStr, formatoCurto);
                        String numeroLimpo = valorStr.replace("-", "").replace(".", "").replace(",", ".").trim();
                        BigDecimal valor = new BigDecimal(numeroLimpo);

                        Transaction t = new Transaction();
                        t.setTransactionDate(dataTransacao);
                        t.setDescription(descricaoStr + " [PDF]");
                        t.setAmount(valor);
                        t.setCategory("EM_ABERTO"); 
                        t.setAccount(contaAlvo); 
                        t.setType("DESPESA"); 

                        transacoesValidas.add(t);
                        totalParaDeduzirDoBanco = totalParaDeduzirDoBanco.add(valor);
                    } catch (Exception e) {}
                }
            }

            if (!transacoesValidas.isEmpty()) {
                contaAlvo.setBalance(contaAlvo.getBalance().subtract(totalParaDeduzirDoBanco));
                accountRepository.save(contaAlvo);
                repository.saveAll(transacoesValidas);
                return ResponseEntity.ok("{\"message\": \"Sucesso!\"}");
            }
            return ResponseEntity.badRequest().body("{\"error\": \"Nenhuma despesa ou saída elegível localizada neste extrato. Lembre-se: Entradas e recebimentos são ignorados automaticamente para proteção de caixa.\"}");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    private List<String> extrairLinhasTextoPdf(MultipartFile file) throws IOException {
        List<String> lines = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String texto = stripper.getText(document);
            if (texto != null) {
                for (String l : texto.split("\\r?\\n")) {
                    if (!l.trim().isEmpty()) lines.add(l.trim());
                }
            }
        }
        return lines;
    }
}