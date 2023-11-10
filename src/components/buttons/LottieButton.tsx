import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import LottieView, { AnimationObject } from 'lottie-react-native';

import { useNoxSetting } from '@hooks/useSetting';
import ShadowedElement from './ShadowedElement';
import { ViewStyle } from 'react-native-windows';

interface Props {
  src: AnimationObject;
  onPress: () => void;
  strokes?: string[];
  size: number;
  style?: ViewStyle;
}

const LottieButton = ({ src, onPress, strokes = [], size, style }: Props) => {
  const playerStyle = useNoxSetting(state => state.playerStyle);
  const animationRef = useRef<LottieView>(null);

  const onPressBtn = () => {
    onPress();
    animationRef.current?.play();
  };

  return (
    <ShadowedElement
      style={{
        backgroundColor: playerStyle.customColors.btnBackgroundColor,
        width: size + 16,
        height: size + 16,
        borderRadius: size / 2 + 8,
        ...style,
      }}
    >
      <Pressable onPress={onPressBtn}>
        <LottieView
          ref={animationRef}
          source={src}
          style={{ width: size, height: size, marginLeft: 8, marginTop: 8 }}
          colorFilters={strokes.map(keypath => ({
            keypath,
            color: playerStyle.colors.primary,
          }))}
          loop={false}
        />
      </Pressable>
    </ShadowedElement>
  );
};

export default LottieButton;
