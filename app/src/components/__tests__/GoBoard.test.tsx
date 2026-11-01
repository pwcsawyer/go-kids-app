import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import { Board } from '../../engine';
import { GoBoard, isWithinSnap } from '../GoBoard';

const press = { onPressPoint: jest.fn() };

async function renderBoard(board: Board, width: number, extra: Partial<ComponentProps<typeof GoBoard>> = {}) {
  press.onPressPoint.mockClear();
  await render(<GoBoard board={board} width={width} onPressPoint={press.onPressPoint} {...extra} />);
}

describe('GoBoard', () => {
  test.each([
    [5, 25],
    [7, 49],
    [9, 81],
  ] as const)('%i 路有 %i 个交叉点', async (size, count) => {
    await render(<GoBoard board={new Board(size)} width={size * 56} onPressPoint={jest.fn()} />);
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(count);
  });

  test('点按交叉点回调坐标', async () => {
    await renderBoard(new Board(5), 300);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('point-2-3'));
    expect(press.onPressPoint).toHaveBeenCalledWith({ x: 2, y: 3 });
  });

  test('格子外不吸附，格子内可以', async () => {
    const width = 300;
    const grid = width / 5;
    await renderBoard(new Board(5), width);
    await fireEvent.press(screen.getByTestId('point-1-1'), {
      nativeEvent: { locationX: grid + 8, locationY: grid / 2 },
    });
    expect(press.onPressPoint).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('point-1-1'), {
      nativeEvent: { locationX: grid / 2, locationY: grid / 2 },
    });
    expect(press.onPressPoint).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  test('吸附范围覆盖整格，半格外不算', () => {
    expect(isWithinSnap(undefined, undefined, 60)).toBe(true);
    expect(isWithinSnap(30, 30, 60)).toBe(true);
    expect(isWithinSnap(0, 0, 60)).toBe(true);
    expect(isWithinSnap(-1, 30, 60)).toBe(false);
    expect(isWithinSnap(90, 30, 60)).toBe(false);
  });

  test('9 路在足够宽度下热区 ≥ 56', async () => {
    const width = 9 * 56;
    await renderBoard(new Board(9), width);
    const style = StyleSheet.flatten(screen.getByTestId('point-4-4').props.style);
    expect(style.width).toBeGreaterThanOrEqual(56);
    expect(style.height).toBeGreaterThanOrEqual(56);
  });

  test('最后一手标记', async () => {
    const board = new Board(5).set({ x: 1, y: 1 }, 'black');
    await renderBoard(board, 300, { lastMove: { x: 1, y: 1 } });
    expect(screen.getByTestId('last-move')).toBeTruthy();
    expect(screen.getByLabelText('黑子 1,1')).toBeTruthy();
  });

  test('空点没有最后一手标记', async () => {
    await renderBoard(new Board(5), 300, { lastMove: { x: 0, y: 0 } });
    expect(screen.queryByTestId('last-move')).toBeNull();
  });

  test('按棋块高亮气', async () => {
    const board = new Board(5).set({ x: 0, y: 0 }, 'black');
    await render(<GoBoard board={board} width={300} libertyFocus={{ x: 0, y: 0 }} onPressPoint={jest.fn()} />);
    expect(screen.getByTestId('liberty-1-0')).toBeTruthy();
    expect(screen.getByTestId('liberty-0-1')).toBeTruthy();
    expect(screen.queryByTestId('liberty-2-2')).toBeNull();
  });

  test('可以直接传入要高亮的气点', async () => {
    await render(
      <GoBoard
        board={new Board(5)}
        width={300}
        liberties={[
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ]}
        onPressPoint={jest.fn()}
      />,
    );
    expect(screen.getByTestId('liberty-2-2')).toBeTruthy();
    expect(screen.getByTestId('liberty-3-2')).toBeTruthy();
  });

  test('空点不显示气', async () => {
    await renderBoard(new Board(5), 300, { libertyFocus: { x: 2, y: 2 } });
    expect(screen.queryByTestId(/^liberty-/)).toBeNull();
  });

  test('非法提示图标：已有子、自杀、劫', async () => {
    const board = new Board(5);
    const rendered = await render(
      <GoBoard
        board={board}
        width={300}
        onPressPoint={jest.fn()}
        hint={{ id: 1, point: { x: 1, y: 1 }, reason: 'occupied' }}
      />,
    );
    const { rerender } = rendered;
    expect(screen.getByTestId('hint-occupied')).toBeTruthy();
    expect(screen.getByLabelText('这里已经有棋子啦')).toBeTruthy();

    await rerender(
      <GoBoard
        board={board}
        width={300}
        onPressPoint={jest.fn()}
        hint={{ id: 2, point: { x: 0, y: 0 }, reason: 'suicide' }}
      />,
    );
    expect(screen.getByTestId('hint-suicide')).toBeTruthy();

    await rerender(
      <GoBoard
        board={board}
        width={300}
        onPressPoint={jest.fn()}
        hint={{ id: 3, point: { x: 2, y: 1 }, reason: 'ko' }}
      />,
    );
    expect(screen.getByTestId('hint-ko')).toBeTruthy();
    expect(screen.getByLabelText('要等一下才能吃回来')).toBeTruthy();
  });

  test('5 路标出天元', async () => {
    await render(<GoBoard board={new Board(5)} width={280} onPressPoint={jest.fn()} />);
    expect(screen.getByTestId('hoshi-2-2')).toBeTruthy();
    expect(screen.queryByTestId('hoshi-4-4')).toBeNull();
  });

  test('9 路标出星位', async () => {
    await render(<GoBoard board={new Board(9)} width={9 * 40} onPressPoint={jest.fn()} />);
    expect(screen.getByTestId('hoshi-4-4')).toBeTruthy();
    expect(screen.getByTestId('hoshi-2-6')).toBeTruthy();
  });
});
