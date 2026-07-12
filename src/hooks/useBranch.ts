import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useBranch = () => {
  const { branchCode: branchCodeFromUrl } = useParams<{ branchCode: string }>();
  const { user } = useAuth();

  // Priority: URL branch code > User's location code
  const branchCode = branchCodeFromUrl || user?.location?.locationCode;

  return {
    branchCode,
    isBranchManager: !!user?.location?.locationCode,
    user,
  };
};
