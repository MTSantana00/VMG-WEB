package com.smartwallet.api.dto;
import java.math.BigDecimal;
import lombok.Data;
@Data
public class GoalSetupDTO {
    private String name;
    private BigDecimal target;
}