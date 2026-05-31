package com.smartwallet.api.dto;

import java.math.BigDecimal;

public class OnboardingSetupDTO {
    private String name;
    private String profession;
    private boolean invests;
    private String bankName;
    private BigDecimal salary;
    
    // Campos do cartão e perguntas rápidas adicionais
    private String cardName;
    private BigDecimal cardLimit;
    private String gastoHojeDesc;
    private BigDecimal gastoHojeValor;
    private String sonhoNome;
    private BigDecimal sonhoAlvo;

    // Getters e Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProfession() { return profession; }
    public void setProfession(String profession) { this.profession = profession; }

    public boolean isInvests() { return invests; }
    public void setInvests(boolean invests) { this.invests = invests; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public BigDecimal getSalary() { return salary; }
    public void setSalary(BigDecimal salary) { this.salary = salary; }

    public String getCardName() { return cardName; }
    public void setCardName(String cardName) { this.cardName = cardName; }

    public BigDecimal getCardLimit() { return cardLimit; }
    public void setCardLimit(BigDecimal cardLimit) { this.cardLimit = cardLimit; }

    public String getGastoHojeDesc() { return gastoHojeDesc; }
    public void setGastoHojeDesc(String gastoHojeDesc) { this.gastoHojeDesc = gastoHojeDesc; }

    public BigDecimal getGastoHojeValor() { return gastoHojeValor; }
    public void setGastoHojeValor(BigDecimal gastoHojeValor) { this.gastoHojeValor = gastoHojeValor; }

    public String getSonhoNome() { return sonhoNome; }
    public void setSonhoNome(String sonhoNome) { this.sonhoNome = sonhoNome; }

    public BigDecimal getSonhoAlvo() { return sonhoAlvo; }
    public void setSonhoAlvo(BigDecimal sonhoAlvo) { this.sonhoAlvo = sonhoAlvo; }
}