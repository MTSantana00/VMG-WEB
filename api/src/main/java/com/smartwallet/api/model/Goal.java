package com.smartwallet.api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "goals")
@Data
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String emoji;
    
    private BigDecimal targetAmount;  // Quanto o usuário precisa (Ex: 5000)
    private BigDecimal currentAmount; // Quanto já tem guardado (Ex: 2000)
    
    private LocalDate deadline;       // Até quando (Aceita null perfeitamente vindo do Onboarding)
    
    @Column(length = 500)
    private String aiAdvice;          // O conselho motivacional gerado pelo Gemini

    // Construtor padrão necessário para o Hibernate e inicialização de valores seguros
    public Goal() {
        this.currentAmount = BigDecimal.ZERO;
    }
}