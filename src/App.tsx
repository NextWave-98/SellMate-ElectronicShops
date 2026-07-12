import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './routes/Router';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { initializeAuthAsync } from './store/authSlice';
import { selectAuthInitialized } from './store/selectors';

/**
 * Auth Initializer Component
 * Initializes auth state from stored tokens on app load
 */
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector(selectAuthInitialized);

  useEffect(() => {
    if (!initialized) {
      dispatch(initializeAuthAsync());
    }
  }, [dispatch, initialized]);

  return <>{children}</>;
};

/**
 * Main App Component
 * Wraps the application with necessary providers
 */
function App() {
  return (
    <Provider store={store}>
      <Router>
        {/* AuthProvider is kept for backward compatibility during migration */}
        <AuthProvider>
          <BusinessProvider>
            <AuthInitializer>
              <AppRouter />
            </AuthInitializer>
          </BusinessProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
