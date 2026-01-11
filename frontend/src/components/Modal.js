import React from 'react';
import './Modal.css';

const Modal = ({ title, children, onClose, large = false, extraLarge = false }) => {
  const modalClass = extraLarge ? 'modal-extra-large' : (large ? 'modal-large' : '');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${modalClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
