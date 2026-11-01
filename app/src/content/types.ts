export interface LessonPoint {
  x: number;
  y: number;
}

export interface LessonLevel {
  id: string;
  kind: string;
  boardSize: number;
  board: string[];
  toPlay?: 'black' | 'white';
  prompt?: { voice?: string; text?: string };
  highlight?: LessonPoint[];
  showLiberties?: boolean;
  target?: LessonPoint;
}

export interface EndRules {
  passEnabled?: boolean;
  autoEndWhenOnlyOwnTrueEyes?: boolean;
  parentEndButton?: boolean;
  moveLimit?: Record<string, number>;
  deadStones?: string;
  scoring?: string;
  komi?: number;
  endPopupVoice?: string;
}

export interface GameSegment {
  type: 'game';
  mode?: string;
  boardSize: number;
  win?: 'score' | 'first_capture' | string;
  captureTarget?: number | null;
  noLegalMoveLoses?: boolean;
  endRules?: EndRules | null;
  hintBulbs?: number;
  durationSec?: number;
}

export interface LessonSegment {
  type: string;
  levels?: LessonLevel[];
  captureTarget?: number | null;
  endRules?: EndRules | null;
  win?: string;
  boardSize?: number;
  noLegalMoveLoses?: boolean;
  mode?: string;
  hintBulbs?: number;
}

export interface Lesson {
  id: string;
  day: number;
  week?: number;
  title: string;
  boardSize: number;
  captureTarget?: number | null;
  segments: LessonSegment[];
}
