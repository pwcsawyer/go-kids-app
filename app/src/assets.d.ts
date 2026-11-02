declare module '*.svg' {
  const value: number;
  export default value;
}

declare module '*.m4a' {
  const value: number;
  export default value;
}

declare module '*.mp3' {
  const value: number;
  export default value;
}

interface RequireContext {
  keys(): string[];
  (id: string): unknown;
}

interface NodeRequire {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp): RequireContext;
}
