/// <reference types="nativewind/types" />

// Redundant-by-design safety net: NativeWind's own ambient type
// augmentation (the triple-slash reference above) is supposed to add
// `className` to every React Native component's props on its own, but
// it isn't always picked up depending on the exact module resolution
// setup. Declaring it directly against react-native's own interfaces
// here works regardless of whether NativeWind's own types resolve
// correctly, since this is plain TypeScript declaration merging against
// a module we control importing from directly.
import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
}

declare module "*.css";