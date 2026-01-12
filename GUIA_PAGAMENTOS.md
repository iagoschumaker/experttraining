# 🎯 GUIA RÁPIDO - CONTROLE DE PAGAMENTOS

## Para você começar a usar AGORA

### 1️⃣ Sistema está configurado?
✅ **SIM!** Tudo funcionando:
- Banco de dados migrado
- 3 planos criados (R$ 150, R$ 140, R$ 130 por personal ativo)
- APIs prontas
- Interface de gerenciamento pronta

### 2️⃣ Como acessar o gerenciamento?
```
URL: http://localhost:3001/superadmin/payments
```
Você verá:
- Quantos studios ativos
- Quantos em período de carência  
- Quantos bloqueados
- Lista de studios com pagamento atrasado
- Lista de pagamentos vencendo nos próximos 7 dias

### 3️⃣ Como marcar um studio como PAGO?
1. Acesse `/superadmin/payments`
2. Encontre o studio na lista
3. Clique em **"Marcar como Pago"**
4. Preencha:
   - Data do pagamento (ex: hoje)
   - Próximo vencimento (ex: daqui 1 mês)
   - Observações (ex: "Pago via PIX - comprovante #123")
5. Confirmar
6. ✅ Pronto! Studio liberado

### 4️⃣ Como BLOQUEAR um studio que não pagou?
1. Acesse `/superadmin/payments`
2. Encontre o studio
3. Clique em **"Bloquear"**
4. Preencha:
   - Motivo (ex: "Pagamento atrasado há 15 dias")
   - Período de carência (ex: 7 dias)
     - 0 dias = bloqueio imediato
     - 7 dias = ainda acessa por 7 dias com aviso
5. Confirmar
6. 🔒 Studio bloqueado (ou entrará em carência)

### 5️⃣ O que o personal vê quando bloqueado?
Tela amigável com:
- "Acesso Bloqueado" ou "Período de Carência"
- Motivo do bloqueio
- Contatos para regularizar
- Email e telefone do suporte

### 6️⃣ IMPORTANTE: Bloqueio é por STUDIO
- Personal trabalha no Studio A (bloqueado) → ❌ Não acessa Studio A
- Mesmo personal no Studio B (pago) → ✅ Acessa Studio B normalmente
- Você (SuperAdmin) → ✅ Sempre acessa tudo

### 7️⃣ Como saber quanto um studio deve?
**Futuramente terá cálculo automático, mas por enquanto:**

1. Conte quantos personals foram ATIVOS no mês
   - **Ativo = fez pelo menos 1**: aula OU avaliação OU treino
   
2. Veja quantos personals ativos:
   - 1-4 personals → R$ 150 cada = 4 x 150 = **R$ 600**
   - 5-9 personals → R$ 140 cada = 8 x 140 = **R$ 1.120**
   - 10+ personals → R$ 130 cada = 15 x 130 = **R$ 1.950**

3. No futuro: API `/api/studio/billing` mostrará isso automaticamente

### 8️⃣ Fluxo recomendado (Manual)
```
📅 Fim do mês → Conte personals ativos
💰 Gere boleto/cobrança
📧 Envie para studio
⏰ Espere pagamento
✅ Recebeu? Marque como pago no sistema
❌ Não pagou em 7 dias? Bloqueie com período de carência
🔒 Passou carência? Bloqueio total automático
```

### 9️⃣ Testando o sistema
Para testar sem afetar studios reais:

1. Crie um studio de teste
2. Marque como não pago
3. Tente fazer login com usuário desse studio
4. Verá a tela de bloqueio
5. Marque como pago
6. Faça login novamente
7. Acesso liberado!

### 🔟 Problemas? Verificar:
```bash
# Ver planos criados
npx prisma studio
# Tabela: plans

# Ver studios e status
# Tabela: studios
# Colunas: is_paid, payment_due_date, grace_period_ends
```

## 📞 Próximas Implementações (você escolhe prioridade)

1. **Cálculo Automático** - Cron job que conta personals ativos todo dia 1
2. **Email Automático** - Lembretes de vencimento
3. **Boleto/PIX** - Integração com Mercado Pago
4. **Interface Studio** - Studio Admin vê próprias faturas
5. **Dashboard Financeiro** - Gráficos de receita

---

**Você está pronto para gerenciar pagamentos! 🚀**

Acesse agora: `http://localhost:3001/superadmin/payments`
