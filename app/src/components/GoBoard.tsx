import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import type { Board, Color, Point } from '../engine';
import { colors } from '../theme';
import { assetSource } from '../ui/assets';
import { motionEnabled, nativeDriver, PLACE_MS } from '../ui/timing';
import { KidStone } from './KidStone';

export const KIDS_SIZES = [5, 7, 9] as const;
export type KidsBoardSize = (typeof KIDS_SIZES)[number];

export type HintReason = 'occupied' | 'suicide' | 'ko' | 'game_over';

export interface BoardHint {
  id: number;
  point: Point;
  reason: HintReason;
}

export interface CaptureBurst {
  id: number;
  color: Color;
  points: Point[];
}

interface GoBoardProps {
  board: Board;
  /** 棋盘边长（px）。可点格子不小于 minHit（默认 56）。 */
  width: number;
  /** 交叉点热区下限（pt/px）。格子更小时放大热区并吸附到最近交叉点。 */
  minHit?: number;
  lastMove?: Point | null;
  /** 显式气点（教学层可直接传入）。 */
  liberties?: Point[];
  /** 高亮该点所在棋块的气；与 liberties 同时存在时以 liberties 为准。 */
  libertyFocus?: Point | null;
  /** 即将落下的半透明预览子。 */
  preview?: { point: Point; color: Color } | null;
  /** 提示灯指出的交叉点。 */
  suggestion?: Point | null;
  hint?: BoardHint | null;
  /** 递增时棋盘轻轻左右摇，表示这步放不下。 */
  shakeSignal?: number;
  /** 刚被提掉的子，画成泡泡飞走。 */
  flying?: CaptureBurst | null;
  onPressPoint: (point: Point) => void;
}

const HOSHI: Record<number, Point[]> = {
  5: [{ x: 2, y: 2 }],
  7: [{ x: 3, y: 3 }],
  9: [
    { x: 2, y: 2 },
    { x: 6, y: 2 },
    { x: 4, y: 4 },
    { x: 2, y: 6 },
    { x: 6, y: 6 },
  ],
};

const HINT_GLYPH: Record<HintReason, string> = {
  occupied: '🪨',
  suicide: '💨',
  ko: '🔁',
  game_over: '🌙',
};

const HINT_LABEL: Record<HintReason, string> = {
  occupied: '这里已经有棋子啦',
  suicide: '这里没有气，换个地方',
  ko: '要等一下才能吃回来',
  game_over: '这盘已经下完啦',
};

/**
 * 交叉点热区是一整格：到格心的切比雪夫距离不超过半格。
 * 正交方向的边界正好是 0.5 格；格角也收进来，避免儿童点在缝上没有反应。
 * 没有坐标（辅助功能 / 测试库的默认事件）时视为点中。
 */
export function isWithinSnap(locationX: number | undefined, locationY: number | undefined, grid: number) {
  if (typeof locationX !== 'number' || typeof locationY !== 'number') return true;
  if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return true;
  const half = grid / 2;
  return Math.abs(locationX - half) <= half + 0.01 && Math.abs(locationY - half) <= half + 0.01;
}

/** 把棋盘坐标吸到最近交叉点。热区半径至少是 minHit 的一半。 */
export function nearestPoint(
  locationX: number,
  locationY: number,
  size: number,
  grid: number,
  minHit: number,
): Point | null {
  if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return null;
  const x = Math.min(size - 1, Math.max(0, Math.round(locationX / grid - 0.5)));
  const y = Math.min(size - 1, Math.max(0, Math.round(locationY / grid - 0.5)));
  const cx = (x + 0.5) * grid;
  const cy = (y + 0.5) * grid;
  const reach = Math.max(grid, minHit) / 2;
  if (Math.max(Math.abs(locationX - cx), Math.abs(locationY - cy)) <= reach + 0.01) return { x, y };
  return null;
}

function flower(cx: number, cy: number, r: number) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { cx: cx + Math.cos(a) * r * 0.62, cy: cy + Math.sin(a) * r * 0.62 };
  });
  return { petals };
}

export function GoBoard({
  board,
  width,
  minHit = 56,
  lastMove = null,
  liberties,
  libertyFocus = null,
  preview = null,
  suggestion = null,
  hint = null,
  shakeSignal = 0,
  flying = null,
  onPressPoint,
}: GoBoardProps) {
  const size = board.size;
  const grid = width / size;
  const hit = Math.max(grid, minHit);
  const center = (i: number) => (i + 0.5) * grid;
  const stoneR = grid * 0.46;
  const [pressed, setPressed] = useState<Point | null>(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const libertyPoints = useMemo(() => {
    if (liberties) return liberties;
    if (!libertyFocus) return [];
    return board.groupAt(libertyFocus)?.liberties ?? [];
  }, [liberties, libertyFocus, board]);

  useEffect(() => {
    if (!motionEnabled || shakeSignal === 0) return;
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 45, useNativeDriver: nativeDriver }),
      Animated.timing(shakeX, { toValue: -8, duration: 45, useNativeDriver: nativeDriver }),
      Animated.timing(shakeX, { toValue: 6, duration: 40, useNativeDriver: nativeDriver }),
      Animated.timing(shakeX, { toValue: -4, duration: 40, useNativeDriver: nativeDriver }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: nativeDriver }),
    ]).start();
  }, [shakeSignal, shakeX]);

  const onPointPress = (point: Point, event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    if (!isWithinSnap(locationX, locationY, hit)) return;
    onPressPoint(point);
  };

  const onBoardPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    if (typeof locationX !== 'number' || typeof locationY !== 'number') return;
    const point = nearestPoint(locationX, locationY, size, grid, minHit);
    if (point) onPressPoint(point);
  };

  const hoshi = HOSHI[size] ?? [];
  const showLast = lastMove && board.get(lastMove);

  return (
    <Animated.View
      testID="go-board"
      accessible={false}
      style={[styles.frame, { width, height: width, transform: [{ translateX: shakeX }] }]}
    >
      <Svg width={width} height={width} pointerEvents="none">
        {Array.from({ length: size }, (_, i) => (
          <G key={`line-${i}`}>
            <Line
              x1={center(0)}
              y1={center(i)}
              x2={center(size - 1)}
              y2={center(i)}
              stroke={colors.line}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <Line
              x1={center(i)}
              y1={center(0)}
              x2={center(i)}
              y2={center(size - 1)}
              stroke={colors.line}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          </G>
        ))}
        {hoshi.map((p) => {
          const { petals } = flower(center(p.x), center(p.y), grid * 0.11);
          return (
            <G key={`hoshi-${p.x}-${p.y}`}>
              {petals.map((petal, index) => (
                <Circle key={index} cx={petal.cx} cy={petal.cy} r={grid * 0.045} fill={colors.line} />
              ))}
              <Circle cx={center(p.x)} cy={center(p.y)} r={grid * 0.04} fill={colors.star} />
            </G>
          );
        })}
        {Array.from({ length: size }, (_, y) =>
          Array.from({ length: size }, (_, x) => {
            const cell = board.get({ x, y });
            if (!cell) return null;
            return <KidStone key={`stone-${x}-${y}`} cx={center(x)} cy={center(y)} r={stoneR} color={cell} />;
          }),
        )}
        {preview ? (
          <KidStone
            cx={center(preview.point.x)}
            cy={center(preview.point.y)}
            r={stoneR}
            color={preview.color}
            opacity={0.55}
          />
        ) : null}
        {suggestion ? (
          <Circle
            cx={center(suggestion.x)}
            cy={center(suggestion.y)}
            r={stoneR * 1.05}
            fill="none"
            stroke={colors.star}
            strokeWidth={4}
          />
        ) : null}
        {showLast ? (
          <Circle
            cx={center(lastMove.x)}
            cy={center(lastMove.y)}
            r={Math.max(5, stoneR * 0.2)}
            fill={colors.orange}
            stroke={colors.white}
            strokeWidth={2}
          />
        ) : null}
        {pressed ? (
          <Circle
            cx={center(pressed.x)}
            cy={center(pressed.y)}
            r={stoneR * 1.05}
            fill="none"
            stroke={colors.blue}
            strokeWidth={3}
            opacity={0.85}
          />
        ) : null}
      </Svg>

      {libertyPoints.map((p) => (
        <View
          key={`lib-${p.x}-${p.y}`}
          testID={`liberty-${p.x}-${p.y}`}
          accessibilityLabel={`气 ${p.x},${p.y}`}
          pointerEvents="none"
          style={[
            styles.liberty,
            {
              left: center(p.x) - grid * 0.28,
              top: center(p.y) - grid * 0.28,
              width: grid * 0.56,
              height: grid * 0.56,
            },
          ]}
        >
          <Text style={{ fontSize: Math.max(16, grid * 0.4), color: colors.star, lineHeight: Math.max(18, grid * 0.46) }}>
            ✦
          </Text>
        </View>
      ))}

      {hoshi.map((p) => (
        <View
          key={`hoshi-hit-${p.x}-${p.y}`}
          testID={`hoshi-${p.x}-${p.y}`}
          accessibilityLabel={`星位 ${p.x},${p.y}`}
          pointerEvents="none"
          style={{ position: 'absolute', left: center(p.x), top: center(p.y), width: 1, height: 1 }}
        />
      ))}

      {preview ? (
        <View
          testID={`preview-${preview.point.x}-${preview.point.y}`}
          accessibilityLabel={`预览 ${preview.color === 'black' ? '黑子' : '白子'} ${preview.point.x},${preview.point.y}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: center(preview.point.x) - 4,
            top: center(preview.point.y) - 4,
            width: 8,
            height: 8,
          }}
        />
      ) : null}

      {suggestion ? (
        <View
          testID={`suggestion-${suggestion.x}-${suggestion.y}`}
          accessibilityLabel="看看这里"
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: center(suggestion.x) - 4,
            top: center(suggestion.y) - 4,
            width: 8,
            height: 8,
          }}
        />
      ) : null}

      {showLast ? (
        <View
          testID="last-move"
          pointerEvents="none"
          accessibilityLabel="最后一手"
          style={{
            position: 'absolute',
            left: center(lastMove.x) - 4,
            top: center(lastMove.y) - 4,
            width: 8,
            height: 8,
          }}
        />
      ) : null}

      <PlaceRipple point={showLast ? lastMove : null} grid={grid} center={center} />
      <FlyingBirds burst={flying ?? null} grid={grid} center={center} />

      {Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => {
          const cell = board.get({ x, y });
          const label = cell === 'black' ? `黑子 ${x},${y}` : cell === 'white' ? `白子 ${x},${y}` : `空点 ${x},${y}`;
          return (
            <Pressable
              key={`hit-${x}-${y}`}
              testID={`point-${x}-${y}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPressIn={() => setPressed({ x, y })}
              onPressOut={() => setPressed(null)}
              onPress={(event) => onPointPress({ x, y }, event)}
              style={{
                position: 'absolute',
                left: x * grid + (grid - hit) / 2,
                top: y * grid + (grid - hit) / 2,
                width: hit,
                height: hit,
              }}
            />
          );
        }),
      )}

      <Pressable
        testID="board-touch"
        accessible={false}
        onPress={onBoardPress}
        style={StyleSheet.absoluteFill}
      />

      {hint ? <HintBubble hint={hint} grid={grid} center={center} /> : null}
    </Animated.View>
  );
}

function HintBubble({
  hint,
  grid,
  center,
}: {
  hint: BoardHint;
  grid: number;
  center: (i: number) => number;
}) {
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motionEnabled) return;
    wobble.setValue(0);
    Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 80, useNativeDriver: nativeDriver }),
      Animated.timing(wobble, { toValue: -1, duration: 80, useNativeDriver: nativeDriver }),
      Animated.timing(wobble, { toValue: 0.6, duration: 70, useNativeDriver: nativeDriver }),
      Animated.timing(wobble, { toValue: 0, duration: 70, useNativeDriver: nativeDriver }),
    ]).start();
  }, [hint.id, wobble]);
  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const bubble = Math.max(64, grid * 0.95);
  const bg = hint.reason === 'game_over' ? colors.blue : colors.pink;
  return (
    <Animated.View
      testID={`hint-${hint.reason}`}
      accessibilityLabel={HINT_LABEL[hint.reason]}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: center(hint.point.x) - bubble / 2,
        top: center(hint.point.y) - bubble / 2,
        width: bubble,
        height: bubble,
        borderRadius: bubble / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.bg,
        transform: [{ rotate }],
      }}
    >
      <Text style={styles.hintGlyph}>{HINT_GLYPH[hint.reason]}</Text>
    </Animated.View>
  );
}

function PlaceRipple({
  point,
  grid,
  center,
}: {
  point: Point | null;
  grid: number;
  center: (i: number) => number;
}) {
  const anim = useRef(new Animated.Value(1)).current;
  const key = point ? `${point.x},${point.y}` : '';
  const skip = useRef(true);
  useEffect(() => {
    if (!motionEnabled) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    if (!point) return;
    anim.setValue(0);
    const animation = Animated.timing(anim, { toValue: 1, duration: PLACE_MS, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [key, anim, point]);
  if (!point) return null;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const d = grid * 0.92;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: center(point.x) - d / 2,
        top: center(point.y) - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: 3,
        borderColor: colors.orange,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function FlyingBirds({
  burst,
  grid,
  center,
}: {
  burst: CaptureBurst | null;
  grid: number;
  center: (i: number) => number;
}) {
  if (!burst) return null;
  return (
    <>
      {burst.points.map((point, index) => (
        <CaptureBird
          key={`${burst.id}-${index}`}
          burstId={burst.id}
          index={index}
          point={point}
          grid={grid}
          center={center}
        />
      ))}
    </>
  );
}

/** 提子：manifest 里的小鸟两帧交替，向右上方飞出。 */
function CaptureBird({
  burstId,
  index,
  point,
  grid,
  center,
}: {
  burstId: number;
  index: number;
  point: Point;
  grid: number;
  center: (i: number) => number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [wingUp, setWingUp] = useState(true);
  useEffect(() => {
    if (!motionEnabled) return;
    const start = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: nativeDriver }).start();
    }, index * 60);
    const flap = setInterval(() => setWingUp((value) => !value), 125);
    return () => {
      clearTimeout(start);
      clearInterval(flap);
      anim.stopAnimation();
    };
  }, [anim, burstId, index]);
  const d = grid * 0.84;
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, grid * 1.8] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -grid * 2.2] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });
  const opacity = anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      testID="capture-bird"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: center(point.x) - d / 2,
        top: center(point.y) - d / 2,
        width: d,
        height: d,
        opacity: motionEnabled ? opacity : 1,
        transform: motionEnabled ? [{ translateX }, { translateY }, { rotate }, { scale }] : [],
      }}
    >
      <Image
        source={assetSource(wingUp ? 'capture_bird_wing_up' : 'capture_bird_wing_down')}
        accessibilityLabel="小鸟飞走"
        style={{ width: d, height: d }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.wood,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: colors.woodEdge,
    overflow: 'hidden',
    shadowColor: colors.line,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  liberty: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintGlyph: {
    fontSize: 32,
    lineHeight: 40,
  },
});
