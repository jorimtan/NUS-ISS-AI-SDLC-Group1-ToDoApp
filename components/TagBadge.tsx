/**
 * TagBadge Component
 * 
 * Displays a colored badge for a tag with optional remove button.
 */

interface TagBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
}

export function TagBadge({ name, color, size = 'md', removable = false, onRemove }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,  // 20% opacity
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span>{name}</span>
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="hover:bg-opacity-20 rounded-full p-0.5 text-lg leading-none"
          type="button"
        >
          ×
        </button>
      )}
    </span>
  );
}
