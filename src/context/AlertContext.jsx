import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AlertModal.css';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [modalState, setModalState] = useState(null);
  const [toastState, setToastState] = useState(null);
  const toastTimeoutRef = useRef(null);

  /**
   * showConfirm:
   * Displays a liquid glass confirmation dialog and returns a Promise<boolean>.
   * @param {string|object} options - Message string or options object { title, message, confirmText, cancelText, danger, type }
   */
  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      const config = typeof options === 'string' ? { message: options } : (options || {});
      setModalState({
        isOpen: true,
        isConfirm: true,
        title: config.title || 'Are you sure?',
        message: config.message || '',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        danger: config.danger !== false,
        type: config.type || (config.danger !== false ? 'danger' : 'question'),
        onConfirm: () => {
          setModalState(null);
          resolve(true);
        },
        onCancel: () => {
          setModalState(null);
          resolve(false);
        }
      });
    });
  }, []);

  /**
   * showAlert:
   * Displays a liquid glass alert dialog and returns a Promise<void>.
   * @param {string|object} options - Message string or options object { title, message, confirmText, type }
   */
  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      const config = typeof options === 'string' ? { message: options } : (options || {});
      setModalState({
        isOpen: true,
        isConfirm: false,
        title: config.title || (config.type === 'error' ? 'Notice' : config.type === 'success' ? 'Success' : 'Notice'),
        message: config.message || '',
        confirmText: config.confirmText || 'OK',
        type: config.type || 'info',
        onConfirm: () => {
          setModalState(null);
          resolve();
        },
        onCancel: () => {
          setModalState(null);
          resolve();
        }
      });
    });
  }, []);

  /**
   * showToast:
   * Displays a non-blocking liquid glass toast notification with optional action (e.g. Undo).
   */
  const showToast = useCallback((message, type = 'info', action = null, duration = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    let toastAction = null;
    let toastDuration = 4000;
    if (typeof action === 'number') {
      toastDuration = action;
    } else {
      toastAction = action;
      if (typeof duration === 'number') toastDuration = duration;
    }

    setToastState({ message, type, action: toastAction });
    toastTimeoutRef.current = setTimeout(() => {
      setToastState(null);
    }, toastDuration);
  }, []);

  return (
    <AlertContext.Provider value={{ showConfirm, showAlert, showToast }}>
      {children}

      {/* Global Liquid Glass Modal Dialog */}
      <AnimatePresence>
        {modalState && modalState.isOpen && (
          <div className="custom-dialog-overlay" onClick={modalState.onCancel}>
            <motion.div
              className={`custom-dialog-card ${modalState.type || 'info'}`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Icon Badge */}
              <div className={`custom-dialog-icon-badge ${modalState.type || 'info'}`}>
                {modalState.type === 'danger' || modalState.danger ? (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                ) : modalState.type === 'success' ? (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                )}
              </div>

              {/* Title & Message */}
              <div className="custom-dialog-content">
                <h3 className="custom-dialog-title">{modalState.title}</h3>
                <p className="custom-dialog-message">{modalState.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="custom-dialog-actions">
                {modalState.isConfirm && (
                  <button
                    type="button"
                    className="custom-dialog-btn custom-dialog-btn--cancel"
                    onClick={modalState.onCancel}
                    autoFocus={!modalState.danger}
                  >
                    {modalState.cancelText}
                  </button>
                )}

                <button
                  type="button"
                  className={`custom-dialog-btn ${modalState.danger ? 'custom-dialog-btn--danger' : 'custom-dialog-btn--confirm'}`}
                  onClick={modalState.onConfirm}
                  autoFocus={modalState.danger}
                >
                  {modalState.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Liquid Glass Toast Notification */}
      <AnimatePresence>
        {toastState && (
          <motion.div
            key="global-toast"
            className={`custom-floating-toast ${toastState.type || 'info'}`}
            drag="y"
            dragSnapToOrigin
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30 || info.velocity.y < -150 || Math.abs(info.offset.x) > 50) {
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                setToastState(null);
              }
            }}
            initial={{ opacity: 0, y: 20, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="toast-dot" />
            <span className="toast-message">{toastState.message}</span>
            {toastState.action && (
              <button 
                type="button" 
                className="toast-action-btn"
                onClick={() => {
                  if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                  setToastState(null);
                  if (toastState.action.onClick) toastState.action.onClick();
                }}
              >
                {toastState.action.label || 'Undo'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
