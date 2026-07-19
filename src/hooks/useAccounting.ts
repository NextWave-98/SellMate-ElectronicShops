/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

const toParams = (filters?: Record<string, any>) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const useAccounting = () => {
  const { fetchData } = useFetch();

  // Chart of accounts
  const listAccounts = useCallback(
    async () => fetchData({ endpoint: '/accounting/accounts', method: 'GET', silent: true }), [fetchData]);
  const seedChart = useCallback(
    async () => fetchData({ endpoint: '/accounting/accounts/seed', method: 'POST', data: {}, successMessage: 'Default chart created' }), [fetchData]);
  const createAccount = useCallback(
    async (data: any) => fetchData({ endpoint: '/accounting/accounts', method: 'POST', data, successMessage: 'Account created' }), [fetchData]);
  const updateAccount = useCallback(
    async (id: string, data: any) => fetchData({ endpoint: `/accounting/accounts/${id}`, method: 'PUT', data, successMessage: 'Account updated' }), [fetchData]);

  // Journals
  const listJournals = useCallback(
    async (filters?: Record<string, any>) => fetchData({ endpoint: `/accounting/journals${toParams(filters)}`, method: 'GET', silent: true }), [fetchData]);
  const getJournal = useCallback(
    async (id: string) => fetchData({ endpoint: `/accounting/journals/${id}`, method: 'GET', silent: true }), [fetchData]);
  const createJournal = useCallback(
    async (data: any) => fetchData({ endpoint: '/accounting/journals', method: 'POST', data, successMessage: 'Journal entry posted' }), [fetchData]);
  const voidJournal = useCallback(
    async (id: string) => fetchData({ endpoint: `/accounting/journals/${id}/void`, method: 'POST', data: {}, successMessage: 'Entry voided' }), [fetchData]);
  const syncSales = useCallback(
    async (from?: string, to?: string) => fetchData({ endpoint: `/accounting/sync/sales${toParams({ from, to })}`, method: 'POST', data: {}, successMessage: 'POS sales posted to accounting' }), [fetchData]);

  // Reports
  const trialBalance = useCallback(
    async (asOf?: string) => fetchData({ endpoint: `/accounting/reports/trial-balance${toParams({ asOf })}`, method: 'GET', silent: true }), [fetchData]);
  const profitAndLoss = useCallback(
    async (from?: string, to?: string) => fetchData({ endpoint: `/accounting/reports/profit-and-loss${toParams({ from, to })}`, method: 'GET', silent: true }), [fetchData]);
  const balanceSheet = useCallback(
    async (asOf?: string) => fetchData({ endpoint: `/accounting/reports/balance-sheet${toParams({ asOf })}`, method: 'GET', silent: true }), [fetchData]);
  const generalLedger = useCallback(
    async (accountId: string, from?: string, to?: string) => fetchData({ endpoint: `/accounting/reports/ledger/${accountId}${toParams({ from, to })}`, method: 'GET', silent: true }), [fetchData]);

  return useMemo(
    () => ({
      listAccounts, seedChart, createAccount, updateAccount,
      listJournals, getJournal, createJournal, voidJournal, syncSales,
      trialBalance, profitAndLoss, balanceSheet, generalLedger,
    }),
    [
      listAccounts, seedChart, createAccount, updateAccount,
      listJournals, getJournal, createJournal, voidJournal, syncSales,
      trialBalance, profitAndLoss, balanceSheet, generalLedger,
    ]
  );
};

export default useAccounting;
