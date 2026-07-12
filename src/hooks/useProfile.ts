import { useState, useCallback } from 'react';
import useFetch from './useFetch';

export interface ProfileFormData {
  name: string;
  email: string;
  phoneNumber: string;
  additionalPhone: string;
  address: string;
  nicNumber: string;
  dateOfBirth: string;
  emergencyContact: string;
  emergencyName: string;
  emergencyRelation: string;
  qualifications: string;
  experience: string;
  notes: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileData {
  name?: string;
  email?: string;
  staff?: {
    phoneNumber?: string;
    additionalPhone?: string;
    address?: string;
    nicNumber?: string;
    dateOfBirth?: string;
    emergencyContact?: string;
    emergencyName?: string;
    emergencyRelation?: string;
    qualifications?: string;
    experience?: string;
    notes?: string;
  };
}

const useProfile = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const { fetchData: fetchProfile } = useFetch('/users/profile');
  const { fetchData: updateProfileFetch, loading: updatingProfile } = useFetch();
  const { fetchData: changePasswordFetch, loading: changingPassword } = useFetch();
  const { fetchData: exportDataFetch, loading: exportingData } = useFetch();

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchProfile({ method: 'GET' });
      if (response?.success && response.data) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  // Update profile
  const updateProfile = async (formData: ProfileFormData) => {
    try {
      const response = await updateProfileFetch({
        method: 'PUT',
        endpoint: '/users/profile',
        data: formData,
      });

      if (response?.success) {
        await loadProfile(); // Reload profile data
        // return { success: true, message: 'Profile updated successfully!' };
      } 
    } catch (error) {
      console.error('Error updating profile:', error);
     
    }
  };

  // Change password
  const changePassword = async (passwordData: { currentPassword: string; newPassword: string }) => {
    try {
      await changePasswordFetch({
        method: 'POST',
        endpoint: '/users/profile/change-password',
        data: passwordData,
      });

   
    } catch (error) {
      console.error('Error changing password:', error);
    
    }
  };

  // Export data
  const exportData = async () => {
    try {
      const response = await exportDataFetch({
        method: 'GET',
        endpoint: '/users/profile/export',
      });

      if (response?.success && response.data) {
        // Create and download the JSON file
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `profile-data-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
      
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  // Get password strength color
  const getPasswordStrengthColor = (strength: number): string => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getPasswordStrengthText = (strength: number): string => {
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  // Convert profile data to form data
  const profileToFormData = (profile: ProfileData | null): ProfileFormData => {
    return {
      name: profile?.name || '',
      email: profile?.email || '',
      phoneNumber: profile?.staff?.phoneNumber || '',
      additionalPhone: profile?.staff?.additionalPhone || '',
      address: profile?.staff?.address || '',
      nicNumber: profile?.staff?.nicNumber || '',
      dateOfBirth: profile?.staff?.dateOfBirth 
        ? new Date(profile.staff.dateOfBirth).toISOString().split('T')[0] 
        : '',
      emergencyContact: profile?.staff?.emergencyContact || '',
      emergencyName: profile?.staff?.emergencyName || '',
      emergencyRelation: profile?.staff?.emergencyRelation || '',
      qualifications: profile?.staff?.qualifications || '',
      experience: profile?.staff?.experience || '',
      notes: profile?.staff?.notes || '',
    };
  };

  // Load profile on mount - handled by component

  return {
    // State
    profileData,
    loading,
    updatingProfile,
    changingPassword,
    exportingData,
    
    // Functions
    loadProfile,
    updateProfile,
    changePassword,
    exportData,
    calculatePasswordStrength,
    getPasswordStrengthColor,
    getPasswordStrengthText,
    profileToFormData,
  };
};

export default useProfile;
