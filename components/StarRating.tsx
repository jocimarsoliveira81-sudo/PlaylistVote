
import React, { useState } from 'react';

interface StarRatingProps {
  initialRating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ initialRating = 0, onRate, disabled = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`text-2xl transition-colors duration-200 ${
            (hover || initialRating) >= star ? 'text-yellow-400' : 'text-gray-300'
          } ${!disabled && 'hover:scale-110 active:scale-95'}`}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onRate(star)}
        >
          <i className="fas fa-star"></i>
        </button>
      ))}
    </div>
  );
};

export default StarRating;
