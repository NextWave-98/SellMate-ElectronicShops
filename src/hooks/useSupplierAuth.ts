/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  supplierRegisterAsync,
  supplierLoginAsync,
  supplierLogoutAsync,
  getSupplierProfileAsync,
  changeSupplierPasswordAsync,
  clearSupplierError,
  initializeSupplierAuth,
} from '../store/supplierAuthSlice';
import alert from '../utils/alert';
import useFetch from './useFetch';

interface SupplierRegisterData {
  name: string;
  companyName?: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  taxId?: string;
}

interface SupplierLoginData {
  email: string;
  password: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const useSupplierAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { supplier, loading, error, isAuthenticated } = useAppSelector((state) => state.supplierAuth);
  
  const { fetchData: fetchProfile } = useFetch('/supplier-auth/profile');
  const { fetchData: fetchUpdateProfile } = useFetch('/supplier-portal/profile', { method: 'PUT' });

  // Register
  const register = useCallback(async (data: SupplierRegisterData) => {
    try {
      const result = await dispatch(supplierRegisterAsync(data)).unwrap();
      alert.success('Registration successful!');
      navigate('/supplier/dashboard');
      return result;
    } catch (error: any) {
      alert.error(error || 'Registration failed');
      throw error;
    }
  }, [dispatch, navigate]);

  // Login
  const login = useCallback(async (data: SupplierLoginData) => {
    try {
      const result = await dispatch(supplierLoginAsync(data)).unwrap();
      alert.success('Login successful!');
      navigate('/supplier/dashboard');
      return result;
    } catch (error: any) {
      alert.error(error || 'Login failed');
      throw error;
    }
  }, [dispatch, navigate]);

  // Logout
  const logout = useCallback(async () => {
    // Clear tokens immediately
    localStorage.removeItem('supplierAccessToken');
    localStorage.removeItem('supplierRefreshToken');
    
    // Dispatch logout to clear Redux state (don't await - we want immediate logout)
    dispatch(supplierLogoutAsync()).catch(() => {
      // Ignore API errors - we've already cleared local state
    });
    
    // Force page reload and redirect to login
    window.location.href = '/supplier/login';
  }, [dispatch]);

  // Change Password
  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      await dispatch(changeSupplierPasswordAsync(data)).unwrap();
      alert.success('Password changed successfully');
    } catch (error: any) {
      alert.error(error || 'Failed to change password');
      throw error;
    }
  }, [dispatch]);

  // Get Profile (using useFetch for flexibility)
  const getProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('supplierAccessToken');
      const response = await fetchProfile({
        accessToken: token || undefined,
        silent: true,
      });
      
      if (response?.success && response.data) {
        return response.data.supplier;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [fetchProfile]);

  // Update Profile (using useFetch)
  const updateProfile = useCallback(async (data: any) => {
    try {
      const token = localStorage.getItem('supplierAccessToken');
      const response = await fetchUpdateProfile({
        accessToken: token || undefined,
        data,
        successMessage: 'Profile updated successfully',
      });
      
      if (response?.success) {
        // Refresh profile in Redux
        await dispatch(getSupplierProfileAsync());
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [fetchUpdateProfile, dispatch]);

  // Initialize auth on mount
  const initializeAuth = useCallback(() => {
    dispatch(initializeSupplierAuth());
  }, [dispatch]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch(clearSupplierError());
  }, [dispatch]);

  // Fetch profile
  const fetchSupplierProfile = useCallback(async () => {
    try {
      await dispatch(getSupplierProfileAsync()).unwrap();
    } catch (error: any) {
      console.error('Error fetching supplier profile:', error);
    }
  }, [dispatch]);

  return {
    supplier,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    changePassword,
    getProfile,
    updateProfile,
    initializeAuth,
    clearError,
    fetchSupplierProfile,
  };
};
