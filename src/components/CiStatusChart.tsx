import React from 'react';

interface CiStatusChartProps {
  success: number;
  failure: number;
  pending: number;
  size?: number;
  strokeWidth?: number;
}

export const CiStatusChart: React.FC<CiStatusChartProps> = ({
  success,
  failure,
  pending,
  size = 24,
  strokeWidth = 3,
}) => {
  const total = success + failure + pending;
  if (total === 0) {
    return null;
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const successPercent = success / total;
  const failurePercent = failure / total;

  const successDash = successPercent * circumference;
  const failureDash = failurePercent * circumference;
  const pendingDash = (pending / total) * circumference;

  const failureRotation = successPercent * 360;
  const pendingRotation = (successPercent + failurePercent) * 360;

  const commonProps = {
    r: radius,
    cx: size / 2,
    cy: size / 2,
    fill: 'transparent',
    strokeWidth: strokeWidth,
    strokeDasharray: `${circumference} ${circumference}`,
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        {...commonProps}
        className="text-base-300"
        stroke="currentColor"
      />
      {success > 0 && (
        <circle
          {...commonProps}
          className="text-success"
          stroke="currentColor"
          strokeDashoffset={circumference - successDash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {failure > 0 && (
        <circle
          {...commonProps}
          className="text-error"
          stroke="currentColor"
          strokeDashoffset={circumference - failureDash}
          transform={`rotate(-90 ${size / 2} ${size / 2}) rotate(${failureRotation} ${size / 2} ${size / 2})`}
        />
      )}
      {pending > 0 && (
        <circle
          {...commonProps}
          className="text-warning"
          stroke="currentColor"
          strokeDashoffset={circumference - pendingDash}
          transform={`rotate(-90 ${size / 2} ${size / 2}) rotate(${pendingRotation} ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
};
