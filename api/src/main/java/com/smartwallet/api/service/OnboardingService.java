package com.smartwallet.api.service;

import com.smartwallet.api.dto.OnboardingSetupDTO;
import com.smartwallet.api.model.*;
import com.smartwallet.api.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class OnboardingService {

    @Autowired private UserProfileRepository profileRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private GoalRepository goalRepository;

    public boolean verificarSeOnboardingJaExiste() {
        return profileRepository.count() > 0;
    }

    @Transactional
    public void executarConfiguracaoInicial(OnboardingSetupDTO dto) {
        // 1. Salva o Perfil do Usuário
        UserProfile perfil = new UserProfile();
        perfil.setName(dto.getName());
        perfil.setProfession(dto.getProfession());
        perfil.setInvests(dto.isInvests());
        profileRepository.save(perfil);

        // 2. Cria a Conta Bancária Corrente Principal
        Account conta = new Account();
        conta.setName(dto.getBankName().toUpperCase().trim());
        conta.setBalance(dto.getSalary());
        conta = accountRepository.save(conta);

        // 3. Cria o Cartão de Crédito com Limite vinculado à Conta
        if (dto.getCardName() != null && !dto.getCardName().isBlank()) {
            Card cartao = new Card();
            cartao.setName(dto.getCardName().toUpperCase().trim());
            cartao.setCreditLimit(dto.getCardLimit());
            cartao.setAvailableLimit(dto.getCardLimit());
            cartao.setAccount(conta);
            cardRepository.save(cartao);
        }

        // 4. Cadastra o salário como uma receita RECORRENTE real e projeta os próximos 3 meses
        for (int i = 0; i < 4; i++) {
            Transaction receitaSalario = new Transaction();
            receitaSalario.setAmount(dto.getSalary());
            receitaSalario.setType("RECEITA");
            receitaSalario.setAccount(conta);
            receitaSalario.setRecurring(true); // Ativa a flag de recorrência real no banco
            
            receitaSalario.setTransactionDate(LocalDate.now().plusMonths(i));
            
            if (i == 0) {
                receitaSalario.setDescription("SALÁRIO MENSAL - " + dto.getBankName().toUpperCase().trim());
                receitaSalario.setCategory("PAGO");
            } else {
                receitaSalario.setDescription("SALÁRIO MENSAL (PROJEÇÃO) - " + dto.getBankName().toUpperCase().trim());
                receitaSalario.setCategory("EM_ABERTO");
            }
            
            transactionRepository.save(receitaSalario);
        }

        // 5. Lança o Gasto Rápido Feito Hoje (se preenchido)
        if (dto.getGastoHojeDesc() != null && !dto.getGastoHojeDesc().isBlank() && dto.getGastoHojeValor().compareTo(BigDecimal.ZERO) > 0) {
            Transaction despesaHoje = new Transaction();
            despesaHoje.setDescription(dto.getGastoHojeDesc().toUpperCase().trim());
            despesaHoje.setAmount(dto.getGastoHojeValor());
            despesaHoje.setType("DESPESA");
            despesaHoje.setCategory("PAGO");
            despesaHoje.setTransactionDate(LocalDate.now());
            despesaHoje.setAccount(conta);
            transactionRepository.save(despesaHoje);
            
            conta.setBalance(conta.getBalance().subtract(dto.getGastoHojeValor()));
            accountRepository.save(conta);
        }

        // 6. Lança o Sonho / Meta Inicial (se preenchido)
        if (dto.getSonhoNome() != null && !dto.getSonhoNome().isBlank() && dto.getSonhoAlvo().compareTo(BigDecimal.ZERO) > 0) {
            Goal sonho = new Goal();
            sonho.setName(dto.getSonhoNome().toUpperCase().trim());
            sonho.setTargetAmount(dto.getSonhoAlvo());
            sonho.setCurrentAmount(BigDecimal.ZERO);
            sonho.setEmoji("🎯");
            goalRepository.save(sonho);
        }
    }
}