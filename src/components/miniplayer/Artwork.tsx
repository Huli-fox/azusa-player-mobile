import { TouchableWithoutFeedback, Dimensions } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Image, useImage } from 'expo-image';

import useActiveTrack from '@hooks/useActiveTrack';
import { MinPlayerHeight } from './Constants';
import { useNoxSetting } from '@stores/useApp';
import { songResolveArtwork } from '@utils/mediafetch/resolveURL';
import logger from '@utils/Logger';

const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

interface Props extends NoxComponent.MiniplayerProps {
  opacity: SharedValue<number>;
  onPress: () => void;
  expand: () => void;
}

export default ({ miniplayerHeight, opacity, onPress, expand }: Props) => {
  const { track } = useActiveTrack();
  const { hideCoverInMobile } = useNoxSetting(state => state.playerSetting);
  const [overwriteAlbumArt, setOverwriteAlbumArt] = useState<string | void>();
  const { width } = Dimensions.get('window');
  // HACK: restrict to 720 to ensure scaleY fluidity
  const img = useImage(
    hideCoverInMobile ? '' : `${overwriteAlbumArt ?? track?.artwork}`,
    {
      maxHeight: 720,
      maxWidth: 720,
      onError: () =>
        logger.warn(`[artwork] failed to load ${track?.mediaId} artwork`),
    },
  );

  const artworkWidth = useDerivedValue(() => {
    return Math.min(miniplayerHeight.value - 25, width);
  });
  const artworkScale = useDerivedValue(() => {
    return artworkWidth.value / width;
  });
  const expandDiff = useDerivedValue(
    () => miniplayerHeight.value - MinPlayerHeight,
  );

  const artworkTranslateY = useDerivedValue(() => {
    return Math.min(100, 35 + (expandDiff.value - width) / 2);
  });
  const artworkTranslateX = useDerivedValue(() => {
    const halfTranslation = (artworkWidth.value - width) / 2;
    if (expandDiff.value < 6) {
      return 5 - expandDiff.value + halfTranslation;
    }
    return halfTranslation;
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: artworkTranslateX.value },
        { translateY: artworkTranslateY.value },
        { scaleX: artworkScale.value },
        { scaleY: artworkScale.value },
      ],
      opacity: opacity.value,
      zIndex: opacity.value > 0 ? 1 : -1,
    };
  });

  const onImagePress = () => {
    if (miniplayerHeight.value === MinPlayerHeight) {
      return expand();
    }
    if (artworkScale.value === 1) {
      return onPress();
    }
  };

  useEffect(() => {
    songResolveArtwork(track?.song)?.then(setOverwriteAlbumArt);
  }, [track]);

  return (
    <TouchableWithoutFeedback onPress={onImagePress}>
      <AnimatedExpoImage
        style={[
          {
            width,
            height: width,
            position: 'absolute',
          },
          animatedStyle,
        ]}
        source={img}
      />
    </TouchableWithoutFeedback>
  );
};
