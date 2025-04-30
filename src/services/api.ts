import { Transaction, Target, AuthUser, DashboardSummary } from '../types';
import { apiClient, apiHelpers } from './apiConfig';

export const AuthAPI = {
  register: async (username: string, email: string, password: string, avatar: File): Promise<AuthUser> => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('avatar', avatar);

      console.log('Registering user with payload:', { username, email, password: '****', avatar: avatar.name });
      const response = await apiClient.post('/signup', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Signup response:', response.data);

      if (response.data.token && response.data.user) {
        console.log('Saving to localStorage:', {
          token: response.data.token.slice(0, 10) + '...',
          user: response.data.user,
        });
        localStorage.setItem('financeTrackerToken', response.data.token);
        localStorage.setItem('financeTrackerUser', JSON.stringify(response.data.user));
      } else {
        console.error('Signup response missing token or user:', response.data);
        throw new Error('Invalid signup response');
      }
      return response.data.user;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  login: async (email: string, password: string): Promise<AuthUser> => {
    try {
      console.log('Logging in with payload:', { email, password: '****' });
      const response = await apiClient.post('/login', { email, password });
      console.log('Login response:', response.data);
  
      if (response.data.token && response.data.user) {
        console.log('Saving to localStorage:', {
          token: response.data.token.slice(0, 10) + '...',
          user: response.data.user,
        });
        localStorage.setItem('financeTrackerToken', response.data.token);
        localStorage.setItem('financeTrackerUser', JSON.stringify(response.data.user));
        console.log('Stored token:', localStorage.getItem('financeTrackerToken')?.slice(0, 10) + '...');
        console.log('Stored user:', localStorage.getItem('financeTrackerUser'));
      } else {
        console.error('Login response missing token or user:', response.data);
        throw new Error('Invalid login response');
      }
      return response.data.user;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      console.log('Logging out, clearing localStorage');
      localStorage.removeItem('financeTrackerToken');
      localStorage.removeItem('financeTrackerUser');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('financeTrackerToken');
      localStorage.removeItem('financeTrackerUser');
      throw error;
    }
  },

  getCurrentUser: async (): Promise<AuthUser | null> => {
    try {
      const token = localStorage.getItem('financeTrackerToken');
      console.log('getCurrentUser - Token:', token ? token.slice(0, 10) + '...' : 'missing');
      if (!token) {
        console.log('No token, returning null');
        return null;
      }
  
      const response = await apiClient.get('/protected', {
        headers: { 'X-Skip-Redirect': 'true' },
      });
      console.log('getCurrentUser response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Get current user error:', error.response?.data || error.message);
      console.log('Error status:', error.response?.status);
      if (error.response?.status === 401) {
        console.log('401 - Token likely expired or invalid');
      }
      return null;
    }
  },

  uploadAvatar: async (file: File): Promise<AuthUser> => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('Uploading avatar:', { fileName: file.name, fileSize: file.size });
      const response = await apiClient.post('/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Avatar upload response:', response.data);

      if (response.data.user) {
        console.log('Updating localStorage with new user data');
        localStorage.setItem('financeTrackerUser', JSON.stringify(response.data.user));
        return response.data.user;
      } else if (response.data.avatar) {
        // If only avatar URL is returned, create a user object with it
        const cachedUserData = localStorage.getItem('financeTrackerUser');
        const cachedUser = cachedUserData ? JSON.parse(cachedUserData) : null;
        
        if (cachedUser) {
          const updatedUser = { 
            ...cachedUser, 
            avatar: response.data.avatar 
          };
          localStorage.setItem('financeTrackerUser', JSON.stringify(updatedUser));
          return updatedUser;
        }
        
        throw new Error('Failed to update user data');
      } else {
        throw new Error('Invalid avatar upload response');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export const TransactionAPI = {
  getAll: async (month?: number, year?: number): Promise<Transaction[]> => {
    try {
      const params = {
        month: month !== undefined ? month : undefined,
        year: year !== undefined ? year : undefined,
      };
      return apiHelpers.get<Transaction[]>('/transactions', params);
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  },

  create: async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    try {
      return apiHelpers.post<Transaction>('/transactions', transaction);
    } catch (error) {
      console.error('Create transaction error:', error);
      throw error;
    }
  },

  update: async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
    try {
      return apiHelpers.post<Transaction>(`/transactions/${id}`, transaction);
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      return apiHelpers.delete(`/transactions/${id}`);
    } catch (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  },
};

export const TargetAPI = {
  getAll: async (): Promise<Target[]> => {
    try {
      return apiHelpers.get<Target[]>('/targets');
    } catch (error) {
      console.error('Get targets error:', error);
      throw error;
    }
  },

  create: async (target: Omit<Target, 'id'>): Promise<Target> => {
    try {
      return apiHelpers.post<Target>('/targets', {
        amount: target.amount,
        category: target.category,
        createdAt: target.createdAt,
        month: target.month,
        year: target.year,
      });
    } catch (error) {
      console.error('Create target error:', error);
      throw error;
    }
  },

  update: async (id: string, target: Partial<Target>): Promise<Target> => {
    try {
      return apiHelpers.put<Target>(`/targets/${id}`, target);
    } catch (error) {
      console.error('Update target error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      return apiHelpers.delete(`/targets/${id}`);
    } catch (error) {
      console.error('Delete target error:', error);
      throw error;
    }
  },
};

export const MonthlyDataAPI = {
  getMonthlySummary: async (month: number, year: number): Promise<DashboardSummary> => {
    try {
      // Updated to use query parameters instead of path parameters
      const params = { year, month: month + 1 }; // month + 1 because month is zero-based
      return apiHelpers.get<DashboardSummary>('/monthly-data/summary', params);
    } catch (error) {
      console.error('Get monthly summary error:', error);
      throw error;
    }
  },

  getAvailableMonths: async (): Promise<{ month: number; year: number }[]> => {
    try {
      return apiHelpers.get<{ month: number; year: number }[]>('/monthly-data/available');
    } catch (error) {
      console.error('Get available months error:', error);
      throw error;
    }
  },
};