package com.smartwallet.api.dto;

import java.math.BigDecimal;
import java.util.List;

public class OnboardingSetupRequest {

    private String name;
    private String profession;
    private Boolean invests;
    private BigDecimal salary;
    private String salaryBankName;
    private List<BankSetupDTO> banks;
    private List<ExpenseSetupDTO> expenses;
    private List<GoalSetupDTO> goals;

    // Getters e Setters da classe principal
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProfession() { return profession; }
    public void setProfession(String profession) { this.profession = profession; }

    public Boolean getInvests() { return invests; }
    public void setInvests(Boolean invests) { this.invests = invests; }

    public BigDecimal getSalary() { return salary; }
    public void setSalary(BigDecimal salary) { this.salary = salary; }

    public String getSalaryBankName() { return salaryBankName; }
    public void setSalaryBankName(String salaryBankName) { this.salaryBankName = salaryBankName; }

    public List<BankSetupDTO> getBanks() { return banks; }
    public void setBanks(List<BankSetupDTO> banks) { this.banks = banks; }

    public List<ExpenseSetupDTO> getExpenses() { return expenses; }
    public void setExpenses(List<ExpenseSetupDTO> expenses) { this.expenses = expenses; }

    public List<GoalSetupDTO> getGoals() { return goals; }
    public void setGoals(List<GoalSetupDTO> goals) { this.goals = goals; }

    // ==========================================
    // INNER CLASSES DTO COM GETTERS/SETTERS
    // ==========================================
    public static class BankSetupDTO {
        private String name;
        private BigDecimal initialBalance;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getInitialBalance() { return initialBalance; }
        public void setInitialBalance(BigDecimal initialBalance) { this.initialBalance = initialBalance; }
    }

    public static class ExpenseSetupDTO {
        private String description;
        private BigDecimal amount;
        private String paymentMethod;
        private Boolean installment;
        private Integer installmentsCount;

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public Boolean getInstallment() { return installment; }
        public void setInstallment(Boolean installment) { this.installment = installment; }

        public Integer getInstallmentsCount() { return installmentsCount; }
        public void setInstallmentsCount(Integer installmentsCount) { this.installmentsCount = installmentsCount; }
    }

    public static class GoalSetupDTO {
        private String name;
        private BigDecimal target;
        private String deadline;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getTarget() { return target; }
        public void setTarget(BigDecimal target) { this.target = target; }

        public String getDeadline() { return deadline; }
        public void setDeadline(String deadline) { this.deadline = deadline; }
    }
}