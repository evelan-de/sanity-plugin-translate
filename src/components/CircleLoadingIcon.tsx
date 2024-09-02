import { SpinnerIcon } from '@sanity/icons';
import React from 'react';

type AnimatedSpinnerIconProps = {
  className?: string;
  onPointerEnterCapture: React.PointerEventHandler<SVGSVGElement>; // Added
  onPointerLeaveCapture: React.PointerEventHandler<SVGSVGElement>; // Added
} & Omit<
  React.SVGProps<SVGSVGElement>,
  'onPointerEnterCapture' | 'onPointerLeaveCapture'
>;

const AnimatedSpinnerIcon: React.FC<AnimatedSpinnerIconProps> = ({
  className,
  ...props
}) => {
  return (
    <SpinnerIcon className={`animate-spin ${className || ''}`} {...props} />
  );
};

export default AnimatedSpinnerIcon;
