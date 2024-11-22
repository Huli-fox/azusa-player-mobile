import React from 'react';
import { View, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import MiniControls from './MiniControls';
import { MinPlayerHeight } from './Constants';
import TrackAlbumArt from './Artwork';
import PlayerTopInfo from './PlayerTopInfo';
import { styles } from '../style';
import TrackInfo from './TrackInfo';
import PlayerControls from '../player/controls/PlayerProgressControls';
import Lrc from './Lrc';
import ProgressBar from './ProgressBar';

const SnapToRatio = 0.15;

export default () => {
  const [lrcVisible, setLrcVisible] = React.useState(false);
  const { width, height } = Dimensions.get('window');
  const miniplayerHeight = useSharedValue(height);
  const artworkOpacity = useSharedValue(1);
  const initHeight = useSharedValue(0);

  const opacityVisible = useDerivedValue(() => {
    if (miniplayerHeight.value > width) {
      return Math.min(
        1,
        ((miniplayerHeight.value - width) / (height - width)) * 2,
      );
    }
    return 0;
  });

  const lrcOpacity = useDerivedValue(() => 1 - artworkOpacity.value);

  const dragPlayerHeight = (translationY: number) => {
    'worklet';
    const newHeight = initHeight.value - translationY;
    miniplayerHeight.value = Math.max(
      MinPlayerHeight,
      Math.min(newHeight, height),
    );
  };

  const expand = () => {
    'worklet';
    miniplayerHeight.value = withTiming(height, { duration: 250 });
    artworkOpacity.value = withTiming(1);
  };
  const collapse = () => {
    'worklet';
    miniplayerHeight.value = withTiming(MinPlayerHeight, { duration: 250 });
    artworkOpacity.value = withTiming(1);
    runOnJS(setLrcVisible)(false);
  };
  const onArtworkPress = () => {
    if (artworkOpacity.value === 1) {
      return (artworkOpacity.value = withTiming(0, { duration: 100 }, () => {
        runOnJS(setLrcVisible)(true);
      }));
    }
    if (artworkOpacity.value === 0) {
      setLrcVisible(false);
      return (artworkOpacity.value = withTiming(1, { duration: 100 }));
    }
  };

  const snapPlayerHeight = (translationY: number) => {
    'worklet';
    if (translationY > height * SnapToRatio) {
      return collapse();
    }
    if (translationY < -height * SnapToRatio) {
      return expand();
    }
    return (miniplayerHeight.value = withTiming(initHeight.value, {
      duration: 250,
    }));
  };

  const scrollDragGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => (initHeight.value = miniplayerHeight.value))
        .onChange(e => dragPlayerHeight(e.translationY))
        .onEnd(e => snapPlayerHeight(e.translationY)),
    [],
  );

  const disabledGesture = React.useMemo(() => Gesture.Manual(), []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: miniplayerHeight.value,
    };
  });
  return (
    <GestureDetector gesture={lrcVisible ? disabledGesture : scrollDragGesture}>
      <Animated.View style={[{ width: '100%', paddingTop: 3 }, animatedStyle]}>
        <View style={styles.rowView}>
          <PlayerTopInfo opacity={opacityVisible} collapse={collapse} />
          <TrackAlbumArt
            miniplayerHeight={miniplayerHeight}
            opacity={artworkOpacity}
            onPress={onArtworkPress}
            expand={expand}
          />
          <MiniControls miniplayerHeight={miniplayerHeight} expand={expand} />
        </View>
        <ProgressBar miniplayerHeight={miniplayerHeight} />
        <Lrc
          visible={lrcVisible}
          opacity={lrcOpacity}
          onPress={onArtworkPress}
        />
        <TrackInfo
          opacity={opacityVisible}
          artworkOpacity={artworkOpacity}
          style={{ width: '100%', top: width + 28 }}
        />
        <PlayerControls
          opacity={opacityVisible}
          style={{ width: '100%', top: width + 28 }}
        />
      </Animated.View>
    </GestureDetector>
  );
};