import React from 'react';
import { Pencil } from 'lucide-react';

const WriteButton = ({ onClick, className = '', children = 'Write.', as: Component = 'button', ...props }) => {
  const ButtonComponent = Component;
  
  return (
    <ButtonComponent
      onClick={onClick}
      className={`neumorphic-write-button ${className}`}
      {...props}
    >
      <Pencil className="write-button-icon" />
      <span className="write-button-text">{children}</span>
    </ButtonComponent>
  );
};

export default WriteButton;

