/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const;

export const useStaffSkills = () => {
  const { fetchData } = useFetch();

  const list = useCallback(
    async (staffId?: string) =>
      fetchData({ endpoint: `/staff-skills${staffId ? `?staffId=${staffId}` : ''}`, method: 'GET', silent: true }),
    [fetchData]
  );
  const add = useCallback(
    async (data: any) => fetchData({ endpoint: '/staff-skills', method: 'POST', data, successMessage: 'Skill added' }),
    [fetchData]
  );
  const remove = useCallback(
    async (id: string) => fetchData({ endpoint: `/staff-skills/${id}`, method: 'DELETE', successMessage: 'Skill removed' }),
    [fetchData]
  );

  return useMemo(() => ({ list, add, remove }), [list, add, remove]);
};

export default useStaffSkills;
