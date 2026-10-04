import { useRef } from "react";
import { View } from "react-native";

// Exercises worklet callbacks/state, not native rendering or its animation clock.
export const pagerAnimation = {
    completions: [] as ((finished: boolean) => void)[],
    style: () => ({ transform: [{ translateX: 0 }] }),
    finish(finished = true) { const callback = this.completions.shift(); if (!callback) throw new Error("No pending page animation"); callback(finished); },
    reset() { this.completions = []; },
};
export const reanimatedMock = {
    __esModule: true,
    default: { View },
    Easing: { cubic: (value: number) => value, out: (easing: unknown) => easing },
    cancelAnimation: jest.fn(),
    runOnUI: <T,>(callback: T) => callback,
    runOnJS: <T,>(callback: T) => callback,
    useSharedValue: <T,>(value: T) => useRef({ value }).current,
    useAnimatedStyle: (style: typeof pagerAnimation.style) => { pagerAnimation.style = style; return style(); },
    withTiming: (target: number, _config: unknown, callback: (finished: boolean) => void) => { pagerAnimation.completions.push(callback); return target; },
};
