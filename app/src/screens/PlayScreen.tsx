import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Game, isTrueEye, legalMoves, opponent, type Color, type Point } from '../engine';
import {
  GoBoard,
  type BoardHint,
  type CaptureBurst,
  type HintReason,
  type KidsBoardSize,
} from '../components/GoBoard';
import { colors } from '../theme';
import { playPreviewSfx } from '../ui/sfx';
import { CAPTURE_MS, HINT_MS, motionEnabled, nativeDriver } from '../ui/timing';

interface PlayScreenProps {
  initialGame?: Game;
  /** 教学关自动显示气。自由对局默认不显示。 */
  showLiberties?: boolean;
  /** 气高亮跟随这一方刚落下的子，避免亮到对方。 */
  playerColor?: Color;
  /** 关卡指定要看的那一块；优先于 playerColor。 */
  libertyFocus?: Point | null;
  /** 毕业考等模式可以关掉悔棋。 */
  allowUndo?: boolean;
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

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function lastPlayPoint(game: Game): Point | null {
  for (let i = game.moves.length - 1; i >= 0; i--) {
    const move = game.moves[i];
    if (move.type === 'play') return move.point;
  }
  return null;
}

function lastStoneOf(game: Game, color: Color): Point | null {
  for (let i = game.moves.length - 1; i >= 0; i--) {
    const move = game.moves[i];
    if (move.type === 'play' && move.color === color) return move.point;
  }
  return null;
}

/** 棋盘尽量占满可用高度，可点格子不小于 56。 */
export function fitBoard(winW: number, winH: number, size: number) {
  const landscape = winW > winH;
  const roomW = winW - (landscape ? 232 : 24);
  const roomH = winH - (landscape ? 16 : 200);
  const room = Math.floor(Math.min(roomW, roomH));
  const cell = Math.max(56, Math.floor(room / size));
  return { landscape, cell, boardPx: cell * size };
}

export function PlayScreen({
  initialGame,
  showLiberties = false,
  playerColor = 'black',
  libertyFocus = null,
  allowUndo = true,
}: PlayScreenProps = {}) {
  const gameRef = useRef<Game>(initialGame ?? new Game(5));
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hint, setHint] = useState<BoardHint | null>(null);
  const [suggestion, setSuggestion] = useState<Point | null>(null);
  const [shake, setShake] = useState(0);
  const [flying, setFlying] = useState<CaptureBurst | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [misses, setMisses] = useState(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintSeq = useRef(0);
  const { width: winW, height: winH } = useWindowDimensions();
  const game = gameRef.current;
  void revision;

  const size = isKidsSize(game.board.size) ? game.board.size : 5;
  const { landscape, boardPx } = fitBoard(winW, winH, size);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const refresh = () => setRevision((n) => n + 1);

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
    setSuggestion(null);
    if (!result.legal) {
      const reason = result.reason;
      if (reason === 'occupied' || reason === 'suicide' || reason === 'ko' || reason === 'game_over') {
        showHint(point, reason);
      }
      setMisses((n) => n + 1);
      return;
    }
    setMisses(0);
    if (result.captured && result.captured.length > 0) {
      const id = hintSeq.current + 1;
      setFlying({ id, color: opponent(played), points: result.captured });
      setFlash({ id, color: played, n: result.captured.length });
    }
    refresh();
  };

  const onPressPoint = (point: Point) => {
    const current = gameRef.current;
    if (current.isOver) {
      showHint(point, 'game_over');
      return;
    }
    const verdict = current.isLegalMove(point);
    if (!verdict.legal) {
      setPreview(null);
      setMisses((n) => n + 1);
      const reason = verdict.reason;
      if (reason === 'occupied' || reason === 'suicide' || reason === 'ko' || reason === 'game_over') {
        showHint(point, reason);
      }
      return;
    }
    if (preview && preview.color === current.toPlay && samePoint(preview.point, point)) {
      commit(point);
      return;
    }
    setPreview({ point, color: current.toPlay });
    playPreviewSfx();
  };

  const onUndo = () => {
    setPreview(null);
    setSuggestion(null);
    if (!gameRef.current.undo()) return;
    setHint(null);
    setFlying(null);
    setFlash(null);
    setMisses(0);
    refresh();
  };

  const onHint = () => {
    const current = gameRef.current;
    if (current.isOver) return;
    const capture = current.findCaptureMoves()[0]?.point;
    const point =
      capture ??
      legalMoves(current.board, current.toPlay, current.koPoint).find(
        (candidate) => !isTrueEye(current.board, candidate, current.toPlay),
      );
    if (point) setSuggestion(point);
  };

  const lastMove = lastPlayPoint(game);
  const libertyPoint = libertyFocus ?? (showLiberties ? lastStoneOf(game, playerColor) : null);
  const score = game.isOver ? game.score() : null;
  const canUndo = game.moves.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View testID="play-layout" style={[styles.layout, landscape ? styles.layoutLand : styles.layoutPort]}>
        <View testID="board-pane" style={styles.boardPane}>
          {!landscape ? <StatusRow game={game} flash={flash} /> : null}
          <GoBoard
            key={size}
            board={game.board}
            width={boardPx}
            minHit={56}
            lastMove={lastMove}
            libertyFocus={libertyPoint}
            preview={preview}
            suggestion={suggestion}
            hint={hint}
            shakeSignal={shake}
            flying={flying}
            onPressPoint={onPressPoint}
          />
          {score ? (
            <View testID="score-banner" accessibilityLabel="下完啦，数一数！" style={styles.banner}>
              <Text style={styles.bannerTitle}>下完啦，数一数！</Text>
              <Text testID="score-black" style={styles.bannerScore}>
                黑 {score.black}
              </Text>
              <Text testID="score-white" style={styles.bannerScore}>
                白 {score.white}
              </Text>
            </View>
          ) : null}
        </View>
        <View testID="button-rail" style={landscape ? styles.rail : styles.bottom}>
          {landscape ? <StatusRow game={game} flash={flash} compact /> : null}
          {allowUndo ? (
            <RoundButton
              testID="btn-undo"
              label="悔棋"
              size={96}
              primary
              disabled={!canUndo}
              onPress={onUndo}
              icon={<UndoIcon />}
            />
          ) : null}
          <RoundButton
            testID="btn-hint"
            label="提示"
            size={80}
            selected={misses >= 3}
            onPress={onHint}
            icon={<Text style={styles.bulb}>💡</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatusRow({ game, flash, compact = false }: { game: Game; flash: Flash | null; compact?: boolean }) {
  return (
    <View style={[styles.scoreRow, compact && styles.scoreCol]}>
      <ScoreBadge color="black" count={game.captures.black} flash={flash?.color === 'black' ? flash : null} />
      {game.isOver ? (
        <View testID="game-done" accessibilityLabel="下完啦，数一数！" style={styles.done}>
          <Text style={styles.doneEmoji}>🌙</Text>
        </View>
      ) : (
        <TurnStone color={game.toPlay} />
      )}
      <ScoreBadge color="white" count={game.captures.white} flash={flash?.color === 'white' ? flash : null} />
    </View>
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
      style={[styles.turn, { backgroundColor: stone, borderColor: edge, transform: [{ scale }] }]}
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
  selected,
}: {
  testID: string;
  label: string;
  size: number;
  onPress: () => void;
  icon: ReactNode;
  primary?: boolean;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? colors.star : primary ? colors.orange : colors.white,
          opacity: disabled ? 0.4 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
    </Pressable>
  );
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  layout: { flex: 1 },
  layoutLand: { flexDirection: 'row' },
  layoutPort: { flexDirection: 'column' },
  boardPane: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rail: {
    width: 208,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    paddingRight: 12,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 88,
    alignSelf: 'stretch',
  },
  scoreCol: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    minHeight: 0,
    paddingHorizontal: 0,
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
  miniStone: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  count: { fontSize: 40, fontWeight: '700', color: colors.text, minWidth: 28 },
  basket: { fontSize: 28 },
  plus: { position: 'absolute', right: 0, top: 0, fontSize: 28, fontWeight: '700', color: colors.green },
  turn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  eye: { position: 'absolute', top: 26, width: 8, height: 8, borderRadius: 4 },
  done: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  doneEmoji: { fontSize: 48, lineHeight: 56 },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.woodEdge,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  bannerTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  bannerScore: { fontSize: 22, fontWeight: '700', color: colors.text },
  bulb: { fontSize: 36, lineHeight: 42 },
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
