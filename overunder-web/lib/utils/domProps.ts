// Utility to filter out non-DOM props to prevent React warnings
// Remove props that shouldn't be passed to DOM elements

export function filterDOMProps<T extends Record<string, any>>(
  props: T,
  allowedProps: string[] = []
): Partial<T> {
  const domProps: Partial<T> = {};
  
  // List of props that should NOT be passed to DOM elements
  const blockedProps = new Set([
    'isActive',
    'isResolved', 
    'timeRemaining',
    'totalBets',
    'totalWinnings',
    'winRate',
    'reputation',
    // Add more as needed
  ]);
  
  for (const [key, value] of Object.entries(props)) {
    // Allow explicitly allowed props
    if (allowedProps.includes(key)) {
      domProps[key as keyof T] = value;
      continue;
    }
    
    // Block known problematic props
    if (blockedProps.has(key)) {
      continue;
    }
    
    // Allow standard HTML attributes
    if (
      key.startsWith('data-') ||
      key.startsWith('aria-') ||
      key === 'className' ||
      key === 'style' ||
      key === 'id' ||
      key === 'role' ||
      key === 'tabIndex' ||
      key === 'onClick' ||
      key === 'onChange' ||
      key === 'onSubmit'
    ) {
      domProps[key as keyof T] = value;
    }
  }
  
  return domProps;
}