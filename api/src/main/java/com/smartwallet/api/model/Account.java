package com.smartwallet.api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "accounts")
@Data
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // Ex: Nubank, Inter, Itaú
    private String type; // CORRENTE, POUPANCA
    private BigDecimal balance; // Saldo da Conta Corrente

    // CORREÇÃO: Carregamento EAGER (imediato) + JoinColumn para garantir que a lista venha preenchida no JSON
    @OneToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "account_id") // Cria a chave estrangeira na tabela de cartões apontando para a conta
    private List<Card> cards = new ArrayList<>(); // Inicializa com ArrayList para evitar NullPointerException nas funções do Controller
}