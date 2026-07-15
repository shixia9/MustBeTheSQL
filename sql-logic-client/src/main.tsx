import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import storageUtils from './utils/storageUtils.ts'
import memoryUtils from './utils/memoryUtils.ts';

// get user from localStorage
const savedUser = storageUtils.getUser();
if (savedUser) {
  memoryUtils.user = savedUser;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
