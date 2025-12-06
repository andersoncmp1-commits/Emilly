import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export interface CourseCardProps {
  title: string;
  imageUrl: string;
  isLocked: boolean;
  onClick: () => void;
  description?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  title,
  imageUrl,
  isLocked,
  onClick,
  description,
}) => {
  return (
    <motion.div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-xl cursor-pointer group"
      onClick={isLocked ? undefined : onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isLocked ? { scale: 1.05 } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Background Image */}
      <motion.img
        src={imageUrl}
        alt={title}
        className={`h-full w-full object-cover transition-all duration-300 ${
          isLocked ? 'grayscale brightness-50' : 'group-hover:brightness-110'
        }`}
      />

      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
          <Lock className="h-12 w-12 text-white/80 mb-2" />
          
          {/* Hover Action for Locked State */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick(); // Trigger handle click potentially for upgrade flow
              }}
              className="px-6 py-2 bg-sacred-gold hover:bg-yellow-600 text-sacred-blue font-bold rounded-full transform hover:scale-105 transition-all shadow-lg"
            >
              Comprar
            </button>
          </motion.div>
        </div>
      )}

      {/* Content Overlay - Always visible at bottom, or maybe gradient */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 h-1/3 flex flex-col justify-end">
        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md">
          {title}
        </h3>
        {description && !isLocked && (
          <p className="text-gray-300 text-xs mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

interface CourseGridProps {
  courses: CourseCardProps[];
}

export const CourseGrid: React.FC<CourseGridProps> = ({ courses }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {courses.map((course, index) => (
        <CourseCard key={index} {...course} />
      ))}
    </div>
  );
};
