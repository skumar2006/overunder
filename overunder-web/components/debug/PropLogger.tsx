// Debug component to log props and catch DOM prop issues
import React from 'react';

interface PropLoggerProps {
  componentName: string;
  props: Record<string, any>;
  children?: React.ReactNode;
}

export function PropLogger({ componentName, props, children }: PropLoggerProps) {
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    // Check for problematic props
    const problematicProps = Object.keys(props).filter(key => 
      ['isActive', 'isResolved', 'timeRemaining'].includes(key)
    );
    
    if (problematicProps.length > 0) {
      console.warn(`⚠️ ${componentName} has potentially problematic props:`, problematicProps);
      console.log('All props:', props);
    }
  }
  
  return <>{children}</>;
}