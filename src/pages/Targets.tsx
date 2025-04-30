import React, { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Target } from '../types';

const Targets: React.FC = () => {
  const { targets, transactions, addTarget, updateTarget, deleteTarget } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [targetAlerts, setTargetAlerts] = useState<{[key: string]: {show: boolean, message: string, type: 'warning' | 'success'}}>({}); 

  const [newTarget, setNewTarget] = useState<Omit<Target, 'id'>>({
    amount: 0,
    category: 'expense',
    createdAt: new Date().toISOString()
  });

  const openAddTargetForm = () => {
    setEditingTarget(null);
    setNewTarget({ 
      amount: 0,
      category: 'expense',
      createdAt: new Date().toISOString()
    });
    setShowForm(true);
  };

  // Calculate current values for targets
  const calculateCurrentValue = (target: Target) => {
    // Get target creation date
    const targetCreationDate = target.createdAt ? new Date(target.createdAt) : new Date();
    
    // Only count transactions that happened AFTER the target was created
    const relevantTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= targetCreationDate;
    });
    
    // Filter transactions based on target category
    if (target.category === 'income') {
      // For income targets, only count income transactions
      return relevantTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    } else {
      // For expense targets, only count expense transactions
      return relevantTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTarget(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Include current date as ISO string for target creation timestamp
    const targetWithTimestamp = {
      ...newTarget,
      createdAt: editingTarget?.createdAt || new Date().toISOString()
    };
    
    if (editingTarget) {
      updateTarget(editingTarget.id, targetWithTimestamp);
    } else {
      addTarget(targetWithTimestamp);
    }
    
    setNewTarget({
      amount: 0,
      category: 'expense',
      createdAt: new Date().toISOString()
    });
    setEditingTarget(null);
    setShowForm(false);
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    setNewTarget({
      amount: target.amount,
      category: target.category,
      createdAt: target.createdAt
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTarget(null);
    setNewTarget({ 
      amount: 0,
      category: 'expense',
      createdAt: new Date().toISOString()
    });
  };

  const calculateProgress = (target: Target) => {
    const currentValue = calculateCurrentValue(target);
    // Ensure both values are parsed as numbers and handle division by zero
    const targetAmount = Number(target.amount) || 0.001; // Avoid division by zero
    const progress = (Number(currentValue) / targetAmount) * 100;
    // Return 0 if result is NaN or negative, cap at 100 if exceeds
    return isNaN(progress) ? 0 : Math.min(Math.max(progress, 0), 100);
  };

  const isTargetExceeded = (target: Target) => {
    const currentValue = calculateCurrentValue(target);
    return currentValue > target.amount;
  };

  const getTargetStatus = (target: Target) => {
    const progress = calculateProgress(target);
    if (progress >= 100) {
      return {
        label: 'Exceeded',
        color: 'text-red-500',
        bgColor: 'bg-red-500',
      };
    } else if (progress >= 90) {
      return {
        label: 'Warning',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
      };
    } else if (progress >= 75) {
      return {
        label: 'On Track',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500',
      };
    } else {
      return {
        label: 'Good',
        color: 'text-green-500',
        bgColor: 'bg-green-500',
      };
    }
  };
  
  // Check for targets approaching their threshold and show alerts
  useEffect(() => {
    const alerts: {[key: string]: {show: boolean, message: string, type: 'warning' | 'success'}} = {};
    
    targets.forEach(target => {
      const progress = calculateProgress(target);
      const isIncomeTarget = target.category === 'income';
      
      if (progress >= 100) {
        alerts[target.id] = {
          show: true,
          message: isIncomeTarget 
            ? `Congratulations! You've reached your income target of $${target.amount.toLocaleString()}`
            : `Warning! You've exceeded your expense limit of $${target.amount.toLocaleString()}`,
          type: isIncomeTarget ? 'success' : 'warning'
        };
      } else if (progress >= 80 && progress < 100) {
        alerts[target.id] = {
          show: true,
          message: isIncomeTarget 
            ? `You're at ${progress.toFixed(1)}% of your income target of $${target.amount.toLocaleString()}`
            : `Warning! You're at ${progress.toFixed(1)}% of your expense limit of $${target.amount.toLocaleString()}`,
          type: isIncomeTarget ? 'success' : 'warning'
        };
      }
    });
    
    setTargetAlerts(alerts);
  }, [targets, transactions]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-0">Financial Targets</h1>
        <button
          className="btn btn-primary w-full sm:w-auto"
          onClick={showForm && !editingTarget ? handleCancel : openAddTargetForm}
        >
          {showForm && !editingTarget ? 'Cancel' : 'Add Target'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingTarget ? 'Edit Target' : 'Add New Target'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Category
                </label>
                <select
                  name="category"
                  value={newTarget.category}
                  onChange={handleInputChange}
                  className="input bg-gray-800 text-white border border-gray-600 w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Amount ($)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newTarget.amount || ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="input bg-gray-800 text-white border border-gray-600 w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  step="1"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              {editingTarget && (
                <button
                  type="button"
                  className="btn bg-gray-700 text-white hover:bg-gray-600 mr-2"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingTarget ? 'Update Target' : 'Add Target'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start">
          <div className="bg-blue-500 bg-opacity-20 rounded-lg p-2 mb-4 sm:mb-0 sm:mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-center sm:text-left">About Financial Targets</h3>
            <p className="text-sm text-gray-400">
              Set targets for your finances to help manage your money. Income targets track your earnings, while expense targets
              help you stay within budget limits. You'll receive alerts when approaching or exceeding these targets.
            </p>
          </div>
        </div>
      </div>
      
      {/* Target Alerts */}
      {Object.keys(targetAlerts).map((targetId) => {
        const alert = targetAlerts[targetId];
        if (!alert.show) return null;
        
        return (
          <div key={`alert-${targetId}`} className={`mb-4 p-3 rounded-md ${alert.type === 'warning' ? 'bg-red-500/20 text-red-100' : 'bg-green-500/20 text-green-100'}`}>
            <div className="flex items-center">
              <div className={`rounded-full p-1 ${alert.type === 'warning' ? 'bg-red-500/30' : 'bg-green-500/30'} mr-3`}>
                {alert.type === 'warning' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p>{alert.message}</p>
              <button 
                onClick={() => {
                  setTargetAlerts(prev => ({
                    ...prev, 
                    [targetId]: {...prev[targetId], show: false}
                  }));
                }}
                className="ml-auto text-white opacity-70 hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {targets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          {targets.map(target => {
            const currentValue = calculateCurrentValue(target);
            const progress = calculateProgress(target);
            const status = getTargetStatus(target);

            return (
              <div key={target.id} className={`card ${target.category === 'income' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        target.category === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {target.category === 'income' ? 'Income Target' : 'Expense Limit'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Target: ${target.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(target)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTarget(target.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm font-medium">Progress ({progress.toFixed(1)}%)</span>
                    <span className={`text-xs sm:text-sm font-medium ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${target.category === 'income' ? 'bg-green-500' : status.bgColor}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs sm:text-sm text-gray-400">Current</span>
                    <p className={`font-semibold text-sm sm:text-base ${
                      target.category === 'income' 
                        ? 'text-green-500' 
                        : (isTargetExceeded(target) ? 'text-red-500' : 'text-white')
                    }`}>
                      ${currentValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm text-gray-400">Remaining</span>
                    <p className="font-semibold text-sm sm:text-base">
                      ${Math.max(target.amount - currentValue, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center p-6 sm:p-8">
          <div className="flex justify-center mb-4">
            <div className="bg-dark p-3 rounded-full cursor-pointer" onClick={openAddTargetForm}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 sm:h-12 w-8 sm:w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No targets set</h3>
          <p className="text-gray-400 mb-4">
            Set financial targets to track your progress and receive alerts.
          </p>
          <button
            className="btn btn-primary"
            onClick={openAddTargetForm}
          >
            Create Your First Target
          </button>
        </div>
      )}
    </div>
  );
};

export default Targets;