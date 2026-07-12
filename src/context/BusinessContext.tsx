/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useCallback, useRef, type ReactNode } from 'react';
import useFetch from '../hooks/useFetch';
import { useAuth } from './AuthContext';

export type IndustryType =
  | 'ELECTRONICS'
  | 'CLOTHING'
  | 'GENERAL'
  | 'VEHICLE_RENTAL'
  | 'CAR_WASH'
  | 'GARAGE';

const INDUSTRY_TYPES: IndustryType[] = [
  'ELECTRONICS',
  'CLOTHING',
  'GENERAL',
  'VEHICLE_RENTAL',
  'CAR_WASH',
  'GARAGE',
];

interface BusinessContextValue {
  industryType: IndustryType;
  isElectronics: boolean;
  isClothing: boolean;
  isGeneral: boolean;
  isVehicleRental: boolean;
  isCarWash: boolean;
  isGarage: boolean;
  refetchBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue>({
  industryType: 'GENERAL',
  isElectronics: false,
  isClothing: false,
  isGeneral: true,
  isVehicleRental: false,
  isCarWash: false,
  isGarage: false,
  refetchBusiness: async () => {},
});

function parseIndustryType(value: unknown): IndustryType | null {
  if (typeof value === 'string' && (INDUSTRY_TYPES as string[]).includes(value)) {
    return value as IndustryType;
  }
  return null;
}

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const { fetchData } = useFetch<{ industryType?: IndustryType }>('/business');
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const userIndustryType = useMemo(
    () => parseIndustryType(user?.business?.industryType),
    [user?.business?.industryType]
  );

  const industryType = useMemo(
    () => userIndustryType ?? 'GENERAL',
    [userIndustryType]
  );

  const refetchBusiness = useCallback(async () => {
    if (!isAuthenticated || !user?.businessId) return;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role?.name ?? '')) {
      return;
    }

    try {
      const res = await fetchDataRef.current({
        method: 'GET',
        silent: true,
        showToastOnError: false,
      } as Parameters<typeof fetchDataRef.current>[0]);

      const parsed = parseIndustryType((res?.data as { industryType?: IndustryType })?.industryType);
      if (parsed && parsed !== userIndustryType) {
        // Profile refresh only — industryType comes from auth user on next login/profile fetch
        console.info('[BusinessContext] Industry type from API:', parsed);
      }
    } catch {
      // keep derived value from user.business
    }
  }, [isAuthenticated, user?.businessId, user?.role?.name, userIndustryType]);

  const value = useMemo(
    () => ({
      industryType,
      isElectronics: industryType === 'ELECTRONICS',
      isClothing: industryType === 'CLOTHING',
      isGeneral: industryType === 'GENERAL',
      isVehicleRental: industryType === 'VEHICLE_RENTAL',
      isCarWash: industryType === 'CAR_WASH',
      isGarage: industryType === 'GARAGE',
      refetchBusiness,
    }),
    [industryType, refetchBusiness]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusinessContext = () => useContext(BusinessContext);
