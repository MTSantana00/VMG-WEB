package com.smartwallet.api.repository;

import com.smartwallet.api.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // 🎯 OTIMIZAÇÃO: Filtro executado diretamente via query indexada no banco PostgreSQL (Ultra rápido)
    @Query("SELECT t FROM Transaction t WHERE t.transactionDate >= :dataLimite")
    List<Transaction> findTransactionsDosUltimosMeses(@Param("dataLimite") LocalDate dataLimite);
}