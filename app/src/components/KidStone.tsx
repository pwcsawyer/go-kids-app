import { Circle, G, Path } from 'react-native-svg';
import type { Color } from '../engine';
import { colors } from '../theme';

interface KidStoneProps {
  cx: number;
  cy: number;
  r: number;
  color: Color;
  opacity?: number;
}

/** 带高光和表情的棋子，方便色弱儿童区分黑白。 */
export function KidStone({ cx, cy, r, color, opacity = 1 }: KidStoneProps) {
  const eye = color === 'black' ? colors.white : colors.black;
  const fill = color === 'black' ? colors.black : colors.white;
  const y = cy + r * 0.26;
  const smile = `M ${cx - r * 0.22} ${y} Q ${cx} ${y + r * 0.18} ${cx + r * 0.22} ${y}`;
  return (
    <G opacity={opacity}>
      <Circle cx={cx + r * 0.06} cy={cy + r * 0.1} r={r} fill="rgba(45,52,54,0.2)" />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={color === 'white' ? colors.whiteStroke : 'transparent'}
        strokeWidth={Math.max(1.5, r * 0.07)}
      />
      <Circle
        cx={cx - r * 0.3}
        cy={cy - r * 0.36}
        r={r * 0.28}
        fill={color === 'black' ? colors.blackHighlight : '#FFFFFF'}
        opacity={color === 'black' ? 1 : 0.95}
      />
      <Circle cx={cx - r * 0.2} cy={cy - r * 0.02} r={r * 0.09} fill={eye} />
      <Circle cx={cx + r * 0.2} cy={cy - r * 0.02} r={r * 0.09} fill={eye} />
      <Path d={smile} stroke={eye} strokeWidth={Math.max(1, r * 0.07)} fill="none" strokeLinecap="round" />
    </G>
  );
}
