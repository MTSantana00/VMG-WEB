package com.smartwallet.api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
@Data
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description;
    private BigDecimal amount;
    private String type; // RECEITA, DESPESA
    private String category; // Alimentação, Transporte, IMPORTADO, etc.
    private LocalDate transactionDate;
    private Integer dueDay;
    private boolean recurring;
    private boolean installment;
    private Integer installmentsCount;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = true)
    private Account account; // Conta corrente onde saiu/entrou o dinheiro (Débito/Pix)

    @ManyToOne
    @JoinColumn(name = "card_id", nullable = true)
    private Card card; // Cartão de crédito onde foi passada a despesa
}