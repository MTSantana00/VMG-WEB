package com.smartwallet.api.dto;
import java.math.BigDecimal;
import lombok.Data;
@Data
public class ExpenseSetupDTO {
    private String description;
    private BigDecimal amount;
    private String paymentMethod;
}