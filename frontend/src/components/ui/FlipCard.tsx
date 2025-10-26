import React, { useState, ReactNode } from 'react';

interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  disabled?: boolean;
}

const FlipCard: React.FC<FlipCardProps> = ({ front, back, className = '', disabled = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div
      className={`flip-card-container ${className}`}
      style={{ perspective: '1000px' }}
    >
      <div
        className={`flip-card-inner ${isFlipped ? 'flipped' : ''} ${disabled ? '' : 'cursor-pointer'}`}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="flip-card-face flip-card-front"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {front}
        </div>

        {/* Back */}
        <div
          className="flip-card-face flip-card-back"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
