/**
 * SQL-Logic-Engine — Multi-Agent AI Data Analysis Platform
 */
import { RouterProvider } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { LlmConfigProvider } from './contexts/LlmConfigContext';
import { I18nProvider } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { router } from './router';

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <LlmConfigProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </LlmConfigProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}
