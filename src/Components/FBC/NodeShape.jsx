import React from 'react';

export default function NodeShape({ shape, w, h, strokeColor, fillColor }) {
  const stroke = strokeColor || '#1f1f1f';
  const fill = fillColor || 'transparent';
  const common = { fill, stroke, strokeWidth: 3 };
  const svgStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  };

  if (shape === 'diamond') {
    return (
      <svg style={svgStyle}>
        <polygon points={`${w / 2},4 ${w - 4},${h / 2} ${w / 2},${h - 4} 4,${h / 2}`} {...common} />
      </svg>
    );
  }

  if (shape === 'parallelogram') {
    const sk = Math.min(22, w * 0.16);
    return (
      <svg style={svgStyle}>
        <polygon points={`${sk + 4},4 ${w - 4},4 ${w - sk - 4},${h - 4} 4,${h - 4}`} {...common} />
      </svg>
    );
  }

  if (shape === 'hexagon') {
    const hx = w * 0.22;
    return (
      <svg style={svgStyle}>
        <polygon points={`${hx + 4},4 ${w - hx - 4},4 ${w - 4},${h / 2} ${w - hx - 4},${h - 4} ${hx + 4},${h - 4} 4,${h / 2}`} {...common} />
      </svg>
    );
  }

  if (shape === 'cylinder') {
    const ry = Math.min(14, h * 0.18);
    return (
      <svg style={svgStyle}>
        <rect x={4} y={ry} width={w - 8} height={h - ry * 2} fill={fill} stroke="none" />
        <line x1={4} y1={ry} x2={4} y2={h - ry} stroke={stroke} strokeWidth={3} />
        <line x1={w - 4} y1={ry} x2={w - 4} y2={h - ry} stroke={stroke} strokeWidth={3} />
        <ellipse cx={w / 2} cy={ry} rx={(w - 8) / 2} ry={Math.max(ry - 1, 2)} {...common} />
        <ellipse cx={w / 2} cy={h - ry} rx={(w - 8) / 2} ry={Math.max(ry - 1, 2)} {...common} />
      </svg>
    );
  }

  return null;
}
