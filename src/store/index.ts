/**
 * Redux Store Configuration
 * Configures the Redux store with all slices and middleware
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import supplierAuthReducer from './supplierAuthSlice';
import organizationReducer from './organizationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    supplierAuth: supplierAuthReducer,
    organization: organizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['auth/login/fulfilled', 'auth/fetchProfile/fulfilled'],
      },
    }),
  devTools: import.meta.env.DEV,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
