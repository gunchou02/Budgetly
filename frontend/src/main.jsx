import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
