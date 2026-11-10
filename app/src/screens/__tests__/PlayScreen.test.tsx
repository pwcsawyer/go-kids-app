import { render, screen, userEvent } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { Board, Game } from '../../engine';
import { PlayScreen, fitBoard } from '../PlayScreen';

jest.mock('../../ui/timing', () => ({
  HINT_MS: 4000,
  CAPTURE_MS: 800,
  PLACE_MS: 200,
  PREVIEW_DEADLINE_MS: 100,
  FEEDBACK_DEADLINE_MS: 200,
  motionEnabled: false,
  nativeDriver: false,
}));

jest.mock('../../ui/sfx', () => ({ playSfx: jest.fn() }));

function setWindow(width: number, height: number) {
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 1 },
    screen: { width, height, scale: 2, fontScale: 1 },
  });
}

async function place(user: ReturnType<typeof userEvent.setup>, x: number, y: number, color: '黑子' | '白子') {
  await user.press(screen.getByTestId(`point-${x}-${y}`));
  expect(screen.getByTestId(`preview-${x}-${y}`)).toBeTruthy();
  expect(screen.queryByLabelText(`${color} ${x},${y}`)).toBeNull();
  await user.press(screen.getByTestId(`point-${x}-${y}`));
  expect(await screen.findByLabelText(`${color} ${x},${y}`)).toBeTruthy();
}

describe('双人同屏对局', () => {
  beforeEach(() => setWindow(1180, 820));

  test('默认 5 路，横屏棋盘在左、按钮在右', async () => {
    await render(<PlayScreen />);
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(25);
    expect(screen.getByTestId('turn-black')).toBeTruthy();
    expect(screen.getByLabelText('悔棋')).toBeTruthy();
    expect(screen.getByLabelText('提示')).toBeTruthy();
    expect(screen.queryByLabelText('停一手')).toBeNull();
    expect(screen.queryByLabelText('重新开始')).toBeNull();
    const layout = StyleSheet.flatten(screen.getByTestId('play-layout').props.style);
    expect(layout.flexDirection).toBe('row');
    const hit = StyleSheet.flatten(screen.getByTestId('point-2-2').props.style);
    expect(hit.width).toBeGreaterThanOrEqual(56);
    expect(hit.height).toBeGreaterThanOrEqual(56);
  });

  test('点一下只出预览，再点同一点才落子', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('point-1-1'));
    expect(screen.getByTestId('preview-1-1')).toBeTruthy();
    expect(screen.getByLabelText('空点 1,1')).toBeTruthy();
    expect(screen.getByTestId('turn-black')).toBeTruthy();
    await user.press(screen.getByTestId('point-2-2'));
    expect(screen.queryByTestId('preview-1-1')).toBeNull();
    expect(screen.getByTestId('preview-2-2')).toBeTruthy();
    expect(screen.queryByLabelText('黑子 2,2')).toBeNull();
    await user.press(screen.getByTestId('point-2-2'));
    expect(await screen.findByLabelText('黑子 2,2')).toBeTruthy();
    expect(screen.getByTestId('turn-white')).toBeTruthy();
  });

  test('悔棋可撤销，没有棋步时按钮不可用', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    expect(screen.getByTestId('btn-undo').props.accessibilityState.disabled).toBe(true);
    await place(user, 1, 1, '黑子');
    expect(screen.getByTestId('btn-undo').props.accessibilityState.disabled).toBe(false);
    await user.press(screen.getByTestId('btn-undo'));
    expect(await screen.findByLabelText('空点 1,1')).toBeTruthy();
    expect(screen.getByTestId('turn-black')).toBeTruthy();
  });

  test('已有子时立刻给出石头提示', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await place(user, 2, 2, '黑子');
    await user.press(screen.getByTestId('point-2-2'));
    expect(screen.getByTestId('hint-occupied')).toBeTruthy();
    expect(screen.getByTestId('turn-white')).toBeTruthy();
  });

  test('角上提子后吃子数加一，并出现泡泡', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await place(user, 1, 0, '黑子');
    await place(user, 0, 0, '白子');
    await place(user, 0, 1, '黑子');
    expect(screen.getByTestId('captures-black-count').props.children).toBe(1);
    expect(screen.queryByLabelText('白子 0,0')).toBeNull();
    expect(screen.getByLabelText('黑子 0,1')).toBeTruthy();
    expect((await screen.findAllByTestId('capture-bird')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('capture-plus')).toBeTruthy();
  });

  test('教学关只显示孩子自己落下的气', async () => {
    await render(<PlayScreen showLiberties playerColor="black" />);
    const user = userEvent.setup();
    await place(user, 0, 0, '黑子');
    expect(screen.getByTestId('liberty-1-0')).toBeTruthy();
    expect(screen.getByTestId('liberty-0-1')).toBeTruthy();
    await place(user, 4, 4, '白子');
    expect(screen.getByTestId('liberty-1-0')).toBeTruthy();
    expect(screen.queryByTestId('liberty-4-3')).toBeNull();
    expect(screen.queryByTestId('liberty-3-4')).toBeNull();
  });

  test('提示灯标出可下的点', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('btn-hint'));
    expect(screen.getByLabelText('看看这里')).toBeTruthy();
  });

  test('劫：不能马上吃回来', async () => {
    const game = new Game(5, {
      board: Board.fromStrings(['.XO..', 'X.XO.', '.XO..', '.....', '.....']),
      toPlay: 'white',
    });
    await render(<PlayScreen initialGame={game} />);
    const user = userEvent.setup();
    await place(user, 1, 1, '白子');
    expect(screen.getByTestId('captures-white-count').props.children).toBe(1);
    await user.press(screen.getByTestId('point-2-1'));
    expect(screen.getByTestId('hint-ko')).toBeTruthy();
    expect(screen.getByLabelText('空点 2,1')).toBeTruthy();
  });

  test('自杀落子立刻弹回，棋盘不变', async () => {
    const game = new Game(5, {
      board: Board.fromStrings(['.X...', 'X....', '.....', '.....', '.....']),
      toPlay: 'white',
    });
    await render(<PlayScreen initialGame={game} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('point-0-0'));
    expect(screen.getByTestId('hint-suicide')).toBeTruthy();
    expect(screen.getByLabelText('空点 0,0')).toBeTruthy();
    expect(screen.getByTestId('turn-white')).toBeTruthy();
  });

  test('只剩真眼时显示数子', async () => {
    const game = new Game(5, {
      board: Board.fromStrings(['.X.XO', 'XXXXO', 'OOOOO', 'O.O.O', 'OOOOO']),
      toPlay: 'black',
    });
    await render(<PlayScreen initialGame={game} />);
    expect(screen.getByText('下完啦，数一数！')).toBeTruthy();
    expect(screen.getByTestId('score-black')).toBeTruthy();
    expect(screen.getByTestId('score-white')).toBeTruthy();
  });

  test('竖屏时按钮栏在棋盘下方', async () => {
    setWindow(744, 1133);
    await render(<PlayScreen initialGame={new Game(9)} />);
    const layout = StyleSheet.flatten(screen.getByTestId('play-layout').props.style);
    expect(layout.flexDirection).toBe('column');
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(81);
    const hit = StyleSheet.flatten(screen.getByTestId('point-4-4').props.style);
    expect(hit.width).toBeGreaterThanOrEqual(56);
    expect(hit.height).toBeGreaterThanOrEqual(56);
  });

  test('横屏、竖屏和 Mac 最小窗口的 9 路格子都不小于 56', () => {
    expect(fitBoard(1180, 820, 9).cell).toBeGreaterThanOrEqual(56);
    expect(fitBoard(1000, 760, 9).cell).toBeGreaterThanOrEqual(56);
    expect(fitBoard(1133, 744, 9).cell).toBeGreaterThanOrEqual(56);
    expect(fitBoard(744, 1133, 9).cell).toBeGreaterThanOrEqual(56);
  });
});
