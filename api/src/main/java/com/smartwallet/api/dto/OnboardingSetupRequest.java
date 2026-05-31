package com.smartwallet.api.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingSetupRequest {

    private String name;
    private String profession;
    private Boolean invests;
    private BigDecimal salary;
    private String salaryBankName; 

    private List<BankSetupDTO> banks; 
    private List<ExpenseSetupDTO> expenses;
    private List<GoalSetupDTO> goals;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BankSetupDTO {
        private String name;
        private BigDecimal initialBalance;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseSetupDTO {
        private String description;
        private BigDecimal amount;
        private String paymentMethod; 
        private Boolean installment; 
        private Integer installmentsCount; 
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalSetupDTO {
        private String name;
        private BigDecimal target;
        private String deadline; // 🎯 Propriedade sincronizada com o passo 7 do bot
    }
}