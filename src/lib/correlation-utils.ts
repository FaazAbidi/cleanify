/**
 * Get color based on correlation strength
 */
export const getCorrelationColor = (value: number | null, isDarkMode: boolean = false) => {
  if (value === null) return isDarkMode ? "#6B7280" : "#9CA3AF";
  const absValue = Math.abs(value);
  
  if (isDarkMode) {
    // Dark mode colors
    if (absValue >= 0.7) return value > 0 ? "#34D399" : "#F87171"; // Strong (positive: green, negative: red)
    if (absValue >= 0.5) return value > 0 ? "#6EE7B7" : "#FCA5A5"; // Moderate
    if (absValue >= 0.3) return value > 0 ? "#A7F3D0" : "#FECACA"; // Weak
    return "#6B7280"; // Very weak (gray)
  } else {
    // Light mode colors
    if (absValue >= 0.7) return value > 0 ? "#10B981" : "#EF4444"; // Strong (positive: green, negative: red)
    if (absValue >= 0.5) return value > 0 ? "#34D399" : "#F87171"; // Moderate
    if (absValue >= 0.3) return value > 0 ? "#6EE7B7" : "#FCA5A5"; // Weak
    return "#9CA3AF"; // Very weak (gray)
  }
};

/**
 * Get description of correlation strength
 */
export const getCorrelationDescription = (value: number | null) => {
  if (value === null) return "Unknown";
  const absValue = Math.abs(value);
  const direction = value > 0 ? "positive" : "negative";
  
  if (absValue >= 0.7) return `Strong ${direction}`;
  if (absValue >= 0.5) return `Moderate ${direction}`;
  if (absValue >= 0.3) return `Weak ${direction}`;
  return "Very weak";
}; 