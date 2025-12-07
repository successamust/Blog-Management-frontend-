import React from 'react';
import WriteButton from '../components/common/WriteButton';
import { useNavigate } from 'react-router-dom';

const WriteButtonDemo = () => {
  const navigate = useNavigate();

  const handleWriteClick = () => {
    // Navigate to create post or dashboard
    navigate('/dashboard?tab=create-post');
  };

  return (
    <div className="neumorphic-container">
      <WriteButton onClick={handleWriteClick} />
    </div>
  );
};

export default WriteButtonDemo;

