import { useEffect, useRef } from "react";
import { View } from "react-native";

// Exercises worklet callbacks/state, not native rendering or its animation clock.
export const pagerAnimation = {
    completions: [] as ((finished: boolean) => void)[],
    styles: new Map<object, () => { transform: { translateX: number }[] }>(),
    style() { return this.styles.values().next().value?.() ?? { transform: [{ translateX: 0 }] }; },
    deferJS: false, deferUI: false,
    jsQueue: [] as (() => void)[], uiQueue: [] as (() => void)[],
    flushJS() { const callbacks = this.jsQueue.splice(0); callbacks.forEach((callback) => callback()); },
    flushUI() { const callbacks = this.uiQueue.splice(0); callbacks.forEach((callback) => callback()); },
    finish(finished = true) { const callback = this.completions.shift(); if (!callback) throw new Error("No pending page animation"); callback(finished); },
    reset() { this.completions = []; this.styles.clear(); this.deferJS = false; this.deferUI = false; this.jsQueue = []; this.uiQueue = []; },
};
export const reanimatedMock = {
    __esModule: true,
    default: { View },
    Easing: { cubic: (value: number) => value, out: (easing: unknown) => easing },
    cancelAnimation: jest.fn(),
    runOnUI: <T extends unknown[]>(callback: (...args: T) => void) => (...args: T) => {
        if (pagerAnimation.deferUI) pagerAnimation.uiQueue.push(() => callback(...args));
        else callback(...args);
    },
    runOnJS: <T extends unknown[]>(callback: (...args: T) => void) => (...args: T) => {
        if (pagerAnimation.deferJS) pagerAnimation.jsQueue.push(() => callback(...args));
        else callback(...args);
    },
    useSharedValue: <T,>(value: T) => useRef({ value }).current,
    useAnimatedStyle: (style: () => { transform: { translateX: number }[] }) => {
        const key = useRef({}).current;
        pagerAnimation.styles.set(key, style);
        useEffect(() => () => { pagerAnimation.styles.delete(key); }, [key]);
        return { get transform() { return style().transform; } };
    },
    withTiming: (target: number, _config: unknown, callback: (finished: boolean) => void) => { pagerAnimation.completions.push(callback); return target; },
};
