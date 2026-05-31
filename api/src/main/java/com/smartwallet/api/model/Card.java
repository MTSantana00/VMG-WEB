package com.smartwallet.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal limitAmount;
    private BigDecimal creditLimit;
    private BigDecimal availableLimit;

    // 🎯 NOVOS ATRIBUTOS DE CONTROLE DE CICLO DE CRÉDITO
    private Integer closingDay;
    private Integer dueDay;

    @Transient
    private BigDecimal invoiceAmount;

    @ManyToOne
    @JoinColumn(name = "account_id")
    @JsonBackReference
    private Account account;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getLimitAmount() { return limitAmount; }
    public void setLimitAmount(BigDecimal limitAmount) { this.limitAmount = limitAmount; }
    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    public BigDecimal getAvailableLimit() { return availableLimit; }
    public void setAvailableLimit(BigDecimal availableLimit) { this.availableLimit = availableLimit; }
    public Integer getClosingDay() { return closingDay; }
    public void setClosingDay(Integer closingDay) { this.closingDay = closingDay; }
    public Integer getDueDay() { return dueDay; }
    public void setDueDay(Integer dueDay) { this.dueDay = dueDay; }
    public BigDecimal getInvoiceAmount() { return invoiceAmount; }
    public void setInvoiceAmount(BigDecimal invoiceAmount) { this.invoiceAmount = invoiceAmount; }
    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }
}