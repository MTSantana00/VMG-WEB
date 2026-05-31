package com.smartwallet.api.repository;

import com.smartwallet.api.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByNameIgnoreCase(String name);

    // 🎯 FILTRO CRÍTICO: Soma as despesas do cartão que caem exatamente no mês e ano passados por parâmetro
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.card.id = :cardId AND t.type = 'DESPESA' AND MONTH(t.transactionDate) = :mes AND YEAR(t.transactionDate) = :ano")
    BigDecimal getFaturaMensalDoCartao(@Param("cardId") Long cardId, @Param("mes") int mes, @Param("ano") int ano);

    @Query("SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.cards")
    List<Account> findAllWithCards();
}