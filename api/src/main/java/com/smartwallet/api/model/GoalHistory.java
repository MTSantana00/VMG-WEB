package com.smartwallet.api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "goal_history")
@Data
public class GoalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // "DEPOSITO" ou "RESGATE"
    private BigDecimal amount;
    private LocalDate date;
    private String bankName; // Guarda o nome do banco usado de referência

    @ManyToOne
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;
}