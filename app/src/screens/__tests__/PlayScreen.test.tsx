import { render, screen, userEvent } from '@testing-library/react-native';
import { Board, Game } from '../../engine';
import { PlayScreen } from '../PlayScreen';

jest.mock('../../ui/timing', () => ({
  PREVIEW_MS: 0,
  HINT_MS: 4000,
  TAP_GUARD_MS: 0,
  CAPTURE_MS: 800,
  PLACE_MS: 200,
  motionEnabled: false,
  nativeDriver: false,
}));

async function place(user: ReturnType<typeof userEvent.setup>, x: number, y: number, color: '黑子' | '白子') {
  await user.press(screen.getByTestId(`point-${x}-${y}`));
  expect(await screen.findByLabelText(`${color} ${x},${y}`)).toBeTruthy();
}

describe('双人同屏对局', () => {
  test('默认 5 路，可切换到 9 路并重开', async () => {
    await render(<PlayScreen />);
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(25);
    expect(screen.getByTestId('turn-black')).toBeTruthy();

    const user = userEvent.setup();
    await place(user, 2, 2, '黑子');
    await user.press(screen.getByTestId('size-9'));
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(81);
    expect(screen.queryByLabelText('黑子 2,2')).toBeNull();
    expect(screen.getByTestId('turn-black')).toBeTruthy();
    expect(screen.getByTestId('hoshi-4-4')).toBeTruthy();
  });

  test('落子、虚手、悔棋、重开', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await place(user, 1, 1, '黑子');
    expect(screen.getByTestId('last-move')).toBeTruthy();
    expect(screen.getByTestId('turn-white')).toBeTruthy();

    await user.press(screen.getByTestId('btn-undo'));
    expect(await screen.findByLabelText('空点 1,1')).toBeTruthy();
    expect(screen.getByTestId('turn-black')).toBeTruthy();

    await user.press(screen.getByTestId('btn-pass'));
    expect(await screen.findByTestId('turn-white')).toBeTruthy();
    await user.press(screen.getByTestId('btn-pass'));
    expect(await screen.findByTestId('game-done')).toBeTruthy();

    await user.press(screen.getByTestId('btn-restart'));
    expect(await screen.findByTestId('turn-black')).toBeTruthy();
    expect(screen.queryByTestId('game-done')).toBeNull();
  });

  test('已有子时给出石头提示', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await place(user, 2, 2, '黑子');
    await user.press(screen.getByTestId('point-2-2'));
    expect(await screen.findByTestId('hint-occupied')).toBeTruthy();
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
    expect((await screen.findAllByTestId('capture-bubble')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('capture-plus')).toBeTruthy();
  });

  test('打开星星后显示最后一手的气', async () => {
    await render(<PlayScreen />);
    const user = userEvent.setup();
    await place(user, 0, 0, '黑子');
    await user.press(screen.getByTestId('toggle-liberties'));
    expect(await screen.findByTestId('liberty-1-0')).toBeTruthy();
    expect(screen.getByTestId('liberty-0-1')).toBeTruthy();
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
    expect(await screen.findByTestId('hint-ko')).toBeTruthy();
    expect(screen.getByLabelText('空点 2,1')).toBeTruthy();
  });

  test('自杀落子会弹回提示，棋盘不变', async () => {
    const game = new Game(5, {
      board: Board.fromStrings(['.X...', 'X....', '.....', '.....', '.....']),
      toPlay: 'white',
    });
    await render(<PlayScreen initialGame={game} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('point-0-0'));
    expect(await screen.findByTestId('hint-suicide')).toBeTruthy();
    expect(screen.getByLabelText('空点 0,0')).toBeTruthy();
    expect(screen.getByTestId('turn-white')).toBeTruthy();
  });
});
