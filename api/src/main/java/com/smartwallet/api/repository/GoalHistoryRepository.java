package com.smartwallet.api.repository;

import com.smartwallet.api.model.GoalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GoalHistoryRepository extends JpaRepository<GoalHistory, Long> {
    List<GoalHistory> findByGoalIdOrderByDateDesc(Long goalId);
}