import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'success', 'danger'
  icon: CustomIcon
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    if (CustomIcon) return <CustomIcon size={48} />;
    
    switch (type) {
      case 'success':
        return <CheckCircle size={48} />;
      case 'danger':
        return <AlertCircle size={48} />;
      default:
        return <AlertCircle size={48} />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'confirm-success';
      case 'danger':
        return 'confirm-danger';
      default:
        return 'confirm-warning';
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className={`confirm-icon ${getTypeClass()}`}>
          {getIcon()}
        </div>

        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button className="confirm-btn cancel-btn" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`confirm-btn confirm-btn-primary ${getTypeClass()}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
