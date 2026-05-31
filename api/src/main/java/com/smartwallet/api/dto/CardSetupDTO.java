package com.smartwallet.api.dto;
import java.math.BigDecimal;
import lombok.Data;
@Data
public class CardSetupDTO {
    private String name;
    private BigDecimal limit;
}