import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Board } from '../engine';
import { GoBoard } from '../components/GoBoard';
import {
  captureTargetOf,
  endRulesOf,
  gameSegment,
  loadLessons,
  practiceLevels,
  ruleLines,
} from '../content/loadLessons';
import type { GameSegment, Lesson, LessonLevel } from '../content/types';
import { colors } from '../theme';

type CatalogItem =
  | { id: string; lesson: Lesson; practice: LessonLevel }
  | { id: string; lesson: Lesson; game: GameSegment };

function catalog(lessons: Lesson[]): CatalogItem[] {
  const items: CatalogItem[] = [];
  for (const lesson of lessons) {
    for (const practice of practiceLevels(lesson)) {
      items.push({ id: practice.id, lesson, practice });
    }
    const game = gameSegment(lesson);
    if (game) items.push({ id: `${lesson.id}-game`, lesson, game });
  }
  return items;
}

export function LessonBrowser({ initialItemId }: { initialItemId?: string } = {}) {
  const lessons = useMemo(() => loadLessons(), []);
  const items = useMemo(() => catalog(lessons), [lessons]);
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId ?? items[0]?.id ?? null);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View testID="lesson-browser" style={[styles.body, landscape ? styles.row : styles.column]}>
        <ScrollView testID="lesson-list" style={[styles.list, landscape && styles.listLand]} contentContainerStyle={styles.listContent}>
          <Text style={styles.heading}>{`${lessons.length} 天`}</Text>
          {lessons.map((lesson) => (
            <View key={lesson.id} testID={`lesson-day-${lesson.day}`}>
              <Text style={styles.dayTitle}>{`${lesson.day}. ${lesson.title}`}</Text>
              {practiceLevels(lesson).map((level) => (
                <LevelRow
                  key={level.id}
                  testID={`level-${level.id}`}
                  label={level.prompt?.text ?? level.id}
                  selected={selectedId === level.id}
                  onPress={() => setSelectedId(level.id)}
                />
              ))}
              {gameSegment(lesson) ? (
                <LevelRow
                  testID={`level-${lesson.id}-game`}
                  label={gameSegment(lesson)?.win === 'first_capture' ? '吃子棋' : '对局'}
                  selected={selectedId === `${lesson.id}-game`}
                  onPress={() => setSelectedId(`${lesson.id}-game`)}
                />
              ) : null}
            </View>
          ))}
        </ScrollView>
        <View testID="level-screen" style={styles.stage}>
          {selected ? <LevelStage item={selected} width={width} height={height} landscape={landscape} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function LevelRow({
  testID,
  label,
  selected,
  onPress,
}: {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.rowBtn, selected && styles.rowBtnOn]}
    >
      <Text style={styles.rowText} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function LevelStage({
  item,
  width,
  height,
  landscape,
}: {
  item: CatalogItem;
  width: number;
  height: number;
  landscape: boolean;
}) {
  const practice = 'practice' in item ? item.practice : null;
  const game = 'game' in item ? item.game : null;
  const size = practice?.boardSize ?? game?.boardSize ?? item.lesson.boardSize;
  const board = practice ? Board.fromStrings(practice.board) : new Board(size === 5 || size === 7 || size === 9 || size === 13 || size === 19 ? size : 9);
  const room = Math.min(landscape ? width - 440 : width - 32, height - (landscape ? 220 : 360));
  const cell = Math.max(56, Math.floor(room / board.size));
  const lines = ruleLines(item.lesson);
  const target = captureTargetOf(item.lesson);
  const rules = endRulesOf(item.lesson);
  return (
    <View style={styles.stageInner}>
      <Text style={styles.stageTitle}>{item.lesson.title}</Text>
      {practice?.prompt?.text ? <Text style={styles.prompt}>{practice.prompt.text}</Text> : null}
      {game && target != null ? (
        <Text testID="capture-target" style={styles.rule}>
          {`先吃到 ${target} 颗`}
        </Text>
      ) : null}
      {rules ? (
        <Text testID="end-rules" style={styles.rule}>
          {lines.join('\n')}
        </Text>
      ) : null}
      {game && target != null && lines.length > 0 ? (
        <Text testID="capture-rules" style={styles.rule}>
          {lines.join('\n')}
        </Text>
      ) : null}
      <GoBoard
        board={board}
        width={cell * board.size}
        minHit={56}
        liberties={practice?.highlight}
        onPressPoint={() => undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  list: { flex: 1 },
  listLand: { width: 400, flexGrow: 0 },
  listContent: { padding: 16, gap: 8 },
  heading: { fontSize: 40, fontWeight: '700', color: colors.text, marginBottom: 8 },
  dayTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 6 },
  rowBtn: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.woodEdge,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowBtnOn: { backgroundColor: colors.star, borderColor: colors.star },
  rowText: { fontSize: 18, color: colors.text },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stageInner: { alignItems: 'center', gap: 8, padding: 12 },
  stageTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  prompt: { fontSize: 20, color: colors.text, textAlign: 'center' },
  rule: { fontSize: 18, color: colors.text, textAlign: 'center' },
});
