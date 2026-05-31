package com.smartwallet.api.dto;

import java.math.BigDecimal;

public class TransferRequest {
    private String sourceBank;
    private String targetBank;
    private BigDecimal amount;

    // Getters e Setters
    public String getSourceBank() { return sourceBank; }
    public void setSourceBank(String sourceBank) { this.sourceBank = sourceBank; }
    public String getTargetBank() { return targetBank; }
    public void setTargetBank(String targetBank) { this.targetBank = targetBank; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}