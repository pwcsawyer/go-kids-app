const { Animated } = require('react-native');

/** 测试中动画立即空转，避免 requestAnimationFrame 跨用例。 */
function inert() {
  return {
    start() {},
    stop() {},
    reset() {},
  };
}

Animated.timing = () => inert();
Animated.spring = () => inert();
Animated.decay = () => inert();
Animated.sequence = () => inert();
Animated.loop = () => inert();
Animated.parallel = () => inert();
