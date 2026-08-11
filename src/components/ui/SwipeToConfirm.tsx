import { useState } from "react";
import { View, Text, ActivityIndicator, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface SwipeToConfirmProps {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;
const TRACK_HEIGHT = 64;
// How far across the track counts as "deliberate" rather than an
// accidental brush — dragging past this fraction commits the action.
const CONFIRM_THRESHOLD_RATIO = 0.75;

/**
 * Built on react-native-gesture-handler + react-native-reanimated — the
 * gesture runs entirely on the UI thread (worklets), which is why this
 * needs GestureHandlerRootView wrapping the app root (see App.tsx).
 *
 * Once dragged past the threshold this is treated as final — it shows a
 * spinner and stays locked at the end rather than resetting itself. The
 * screens using this are all offline-first (the action is queued to
 * SQLite instantly and basically can't "fail" synchronously), so the
 * expected outcome is the parent's data changing underneath this button
 * and unmounting/replacing it, not this component reverting on its own.
 */
export function SwipeToConfirm({ label, onConfirm, disabled = false }: SwipeToConfirmProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const translateX = useSharedValue(0);

  const maxTranslate = Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 0);
  const isLocked = disabled || confirming;

  function handleLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  function handleConfirmed() {
    setConfirming(true);
    onConfirm();
  }

  // Gesture.Pan() is rebuilt every render, so — unlike PanResponder — it
  // always closes over the current maxTranslate/isLocked without needing
  // a manual ref-sync workaround.
  const pan = Gesture.Pan()
    .enabled(!isLocked)
    .onChange((event) => {
      translateX.value = Math.min(Math.max(translateX.value + event.changeX, 0), maxTranslate);
    })
    .onEnd(() => {
      if (maxTranslate > 0 && translateX.value / maxTranslate >= CONFIRM_THRESHOLD_RATIO) {
        translateX.value = withTiming(maxTranslate, { duration: 150 });
        runOnJS(handleConfirmed)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + TRACK_PADDING,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, Math.max(maxTranslate, 1)], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      onLayout={handleLayout}
      className={`h-16 justify-center overflow-hidden rounded-2xl bg-paper ${
        isLocked && !confirming ? "opacity-50" : ""
      }`}
    >
      {trackWidth > 0 && (
        <>
          <Animated.View
            pointerEvents="none"
            className="absolute inset-y-0 left-0 rounded-2xl bg-indigo/15"
            style={fillStyle}
          />
          <Animated.Text
            pointerEvents="none"
            className="w-full text-center text-base font-semibold text-ink"
            style={labelStyle}
          >
            {label}
          </Animated.Text>
          <GestureDetector gesture={pan}>
            <Animated.View
              className="absolute items-center justify-center rounded-xl bg-indigo shadow"
              style={[
                {
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  left: TRACK_PADDING,
                  top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
                },
                thumbStyle,
              ]}
            >
              {confirming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-lg text-white">→</Text>
              )}
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </View>
  );
}
