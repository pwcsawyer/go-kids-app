import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Game, opponent, type Color, type Point } from '../engine';
import {
  GoBoard,
  KIDS_SIZES,
  type BoardHint,
  type CaptureBurst,
  type HintReason,
  type KidsBoardSize,
} from '../components/GoBoard';
import { colors } from '../theme';
import { CAPTURE_MS, HINT_MS, motionEnabled, nativeDriver, PREVIEW_MS, TAP_GUARD_MS } from '../ui/timing';

interface PlayScreenProps {
  /** 关卡或测试可传入已开局的局面；默认空盘 5 路。 */
  initialGame?: Game;
}

interface Preview {
  point: Point;
  color: Color;
}

interface Flash {
  id: number;
  color: Color;
  n: number;
}

function isKidsSize(size: number): size is KidsBoardSize {
  return size === 5 || size === 7 || size === 9;
}

function lastPlayPoint(game: Game): Point | null {
  for (let i = game.moves.length - 1; i >= 0; i--) {
    const move = game.moves[i];
    if (move.type === 'play') return move.point;
  }
  return null;
}

export function PlayScreen({ initialGame }: PlayScreenProps = {}) {
  const gameRef = useRef<Game>(initialGame ?? new Game(5));
  const [size, setSize] = useState<KidsBoardSize>(() => {
    const current = initialGame?.board.size ?? 5;
    return isKidsSize(current) ? current : 5;
  });
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hint, setHint] = useState<BoardHint | null>(null);
  const [shake, setShake] = useState(0);
  const [flying, setFlying] = useState<CaptureBurst | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showStars, setShowStars] = useState(false);
  const [slot, setSlot] = useState<{ w: number; h: number } | null>(null);

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  const hintSeq = useRef(0);

  const { width: winW, height: winH } = useWindowDimensions();
  const game = gameRef.current;
  void revision;

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const refresh = () => setRevision((n) => n + 1);

  const clearPreview = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    setPreview(null);
  };

  const showHint = (point: Point, reason: HintReason) => {
    hintSeq.current += 1;
    setHint({ id: hintSeq.current, point, reason });
    setShake((n) => n + 1);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), HINT_MS);
  };

  const commit = (point: Point) => {
    const current = gameRef.current;
    const played = current.toPlay;
    const result = current.play(point);
    setPreview(null);
    if (!result.legal) {
      const reason = result.reason;
      if (reason === 'occupied' || reason === 'suicide' || reason === 'ko' || reason === 'game_over') {
        showHint(point, reason);
      }
      return;
    }
    if (result.captured && result.captured.length > 0) {
      const id = Date.now();
      setFlying({ id, color: opponent(played), points: result.captured });
      setFlash({ id, color: played, n: result.captured.length });
    }
    refresh();
  };

  const onPressPoint = (point: Point) => {
    const now = Date.now();
    if (now - lastTap.current < TAP_GUARD_MS) return;
    if (previewTimer.current) return;
    lastTap.current = now;

    const current = gameRef.current;
    if (current.isOver) {
      showHint(point, 'game_over');
      return;
    }
    const verdict = current.isLegalMove(point);
    if (!verdict.legal && verdict.reason === 'occupied') {
      showHint(point, 'occupied');
      return;
    }
    if (!verdict.legal && (verdict.reason === 'suicide' || verdict.reason === 'ko')) {
      setPreview({ point, color: current.toPlay });
      previewTimer.current = setTimeout(() => {
        previewTimer.current = null;
        setPreview(null);
        showHint(point, verdict.reason as 'suicide' | 'ko');
      }, PREVIEW_MS);
      return;
    }
    if (!verdict.legal) return;

    setPreview({ point, color: current.toPlay });
    previewTimer.current = setTimeout(() => {
      previewTimer.current = null;
      commit(point);
    }, PREVIEW_MS);
  };

  const onUndo = () => {
    if (previewTimer.current) {
      clearPreview();
      return;
    }
    if (!gameRef.current.undo()) return;
    setHint(null);
    setFlying(null);
    setFlash(null);
    refresh();
  };

  const onPass = () => {
    if (previewTimer.current) {
      clearPreview();
      return;
    }
    if (gameRef.current.isOver) return;
    if (!gameRef.current.pass()) return;
    setHint(null);
    refresh();
  };

  const restart = (next: KidsBoardSize) => {
    clearPreview();
    gameRef.current = new Game(next);
    setSize(next);
    setHint(null);
    setFlying(null);
    setFlash(null);
    setShowStars(false);
    refresh();
  };

  const fitted = slot ? Math.min(slot.w - 8, slot.h - 8) : Math.min(winW - 16, winH * 0.62);
  const boardPx = Math.max(220, Math.floor(fitted));
  const lastMove = lastPlayPoint(game);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.sizes}>
          {KIDS_SIZES.map((n) => (
            <Pressable
              key={n}
              testID={`size-${n}`}
              accessibilityRole="button"
              accessibilityLabel={`${n}路棋盘`}
              accessibilityState={{ selected: size === n }}
              onPress={() => {
                if (n !== size) restart(n);
              }}
              style={({ pressed }) => [styles.sizeBtn, size === n && styles.sizeBtnOn, pressed && styles.pressed]}
            >
              <Text style={styles.sizeText}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          testID="toggle-liberties"
          accessibilityRole="button"
          accessibilityLabel={showStars ? '气的星星开着' : '看看气'}
          accessibilityState={{ selected: showStars }}
          onPress={() => setShowStars((v) => !v)}
          style={({ pressed }) => [styles.starBtn, showStars && styles.starBtnOn, pressed && styles.pressed]}
        >
          <Text style={styles.starGlyph}>✦</Text>
        </Pressable>
      </View>

      <View style={styles.scoreRow}>
        <ScoreBadge color="black" count={game.captures.black} flash={flash?.color === 'black' ? flash : null} />
        {game.isOver ? (
          <View testID="game-done" accessibilityLabel="都停手啦" style={styles.done}>
            <Text style={styles.doneEmoji}>🌙</Text>
          </View>
        ) : (
          <TurnStone color={game.toPlay} />
        )}
        <ScoreBadge color="white" count={game.captures.white} flash={flash?.color === 'white' ? flash : null} />
      </View>

      <View
        style={styles.boardSlot}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSlot({ w: width, h: height });
        }}
      >
        <GoBoard
          key={size}
          board={game.board}
          width={boardPx}
          lastMove={lastMove}
          libertyFocus={showStars ? lastMove : null}
          preview={preview}
          hint={hint}
          shakeSignal={shake}
          flying={flying}
          onPressPoint={onPressPoint}
        />
      </View>

      <View style={styles.bottom}>
        <RoundButton
          testID="btn-pass"
          label="停一手"
          size={72}
          disabled={game.isOver}
          onPress={onPass}
          icon={<PassIcon />}
        />
        <RoundButton testID="btn-undo" label="倒回去" size={96} primary onPress={onUndo} icon={<UndoIcon />} />
        <RoundButton testID="btn-restart" label="重新开始" size={72} onPress={() => restart(size)} icon={<RestartIcon />} />
      </View>
    </SafeAreaView>
  );
}

function ScoreBadge({ color, count, flash }: { color: Color; count: number; flash: Flash | null }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(count);
  useEffect(() => {
    if (motionEnabled && count > prev.current) {
      scale.setValue(1.22);
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: nativeDriver }).start();
    }
    prev.current = count;
  }, [count, scale]);
  const stone = color === 'black' ? colors.black : colors.white;
  const edge = color === 'black' ? colors.black : colors.whiteStroke;
  return (
    <View
      testID={`captures-${color}`}
      accessibilityLabel={`${color === 'black' ? '黑棋' : '白棋'}吃了${count}颗`}
      style={styles.badge}
    >
      <View style={[styles.miniStone, { backgroundColor: stone, borderColor: edge }]} />
      <Animated.Text testID={`captures-${color}-count`} style={[styles.count, { transform: [{ scale }] }]}>
        {count}
      </Animated.Text>
      <Text style={styles.basket}>🧺</Text>
      {flash ? <PlusFly key={flash.id} n={flash.n} /> : null}
    </View>
  );
}

function PlusFly({ n }: { n: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motionEnabled) return;
    Animated.timing(anim, { toValue: 1, duration: CAPTURE_MS, useNativeDriver: nativeDriver }).start();
  }, [anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, -36] });
  const opacity = anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.Text testID="capture-plus" style={[styles.plus, { opacity, transform: [{ translateY }] }]}>
      +{n}
    </Animated.Text>
  );
}

function TurnStone({ color }: { color: Color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!motionEnabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 700, useNativeDriver: nativeDriver }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [color, scale]);
  const stone = color === 'black' ? colors.black : colors.white;
  const edge = color === 'black' ? colors.black : colors.whiteStroke;
  return (
    <Animated.View
      testID={`turn-${color}`}
      accessibilityLabel={color === 'black' ? '轮到黑棋' : '轮到白棋'}
      style={[
        styles.turn,
        { backgroundColor: stone, borderColor: edge, transform: [{ scale }] },
      ]}
    >
      <View style={[styles.eye, { backgroundColor: color === 'black' ? colors.white : colors.black, left: 16 }]} />
      <View style={[styles.eye, { backgroundColor: color === 'black' ? colors.white : colors.black, right: 16 }]} />
    </Animated.View>
  );
}

function RoundButton({
  testID,
  label,
  size,
  onPress,
  icon,
  primary,
  disabled,
}: {
  testID: string;
  label: string;
  size: number;
  onPress: () => void;
  icon: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: primary ? colors.orange : colors.white,
          opacity: disabled ? 0.4 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function PassIcon() {
  return <Text style={styles.passHand}>✋</Text>;
}

function UndoIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Path
        d="M18 16h14a8 8 0 1 1 0 16H16"
        stroke={colors.text}
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M18 9l-8 7 8 7" stroke={colors.text} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RestartIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Path
        d="M8 18a10 10 0 1 0 3-7"
        stroke={colors.text}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M8 8v7h7" stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sizes: {
    flexDirection: 'row',
    gap: 16,
  },
  sizeBtn: {
    minWidth: 64,
    minHeight: 64,
    paddingHorizontal: 8,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.woodEdge,
  },
  sizeBtnOn: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  sizeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  starBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.woodEdge,
  },
  starBtnOn: {
    backgroundColor: colors.star,
    borderColor: colors.star,
  },
  starGlyph: {
    fontSize: 32,
    color: colors.line,
    lineHeight: 38,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 88,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
    minHeight: 64,
  },
  miniStone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  count: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    minWidth: 36,
  },
  basket: {
    fontSize: 28,
  },
  plus: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 28,
    fontWeight: '700',
    color: colors.green,
  },
  turn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  eye: {
    position: 'absolute',
    top: 26,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  done: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  boardSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  passHand: {
    fontSize: 34,
    lineHeight: 40,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.woodEdge,
    shadowColor: colors.line,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
});
