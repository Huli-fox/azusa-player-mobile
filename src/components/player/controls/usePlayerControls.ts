import React from 'react';
import TrackPlayer, {
  useTrackPlayerEvents,
  Event,
  State,
} from 'react-native-track-player';

import { useNoxSetting } from '@stores/useApp';
import useTPControls from '@hooks/useTPControls';
import { saveLastPlayDuration } from '@utils/ChromeStorage';
import { logger } from '@utils/Logger';
import appStore, {
  getABRepeatRaw,
  setCurrentPlaying,
  setCrossfaded,
} from '@stores/appStore';
import noxPlayingList from '@stores/playingList';
import { NoxRepeatMode } from '@enums/RepeatMode';
import usePlaylistCRUD from '@hooks/usePlaylistCRUD';
import { getR128Gain } from '@utils/ffmpeg/r128Store';
import { isAndroid } from '@utils/RNUtils';
import { useTrackStore } from '@hooks/useActiveTrack';
import { execWhenTrue } from '@utils/Utils';

const { getState } = noxPlayingList;
const { fadeIntervalMs, fadeIntervalSec } = appStore.getState();

export default () => {
  const { performSkipToNext, performSkipToPrevious, prepareSkipToNext } =
    useTPControls();
  const [abRepeat, setABRepeat] = React.useState<[number, number]>([0, 1]);
  const [bRepeatDuration, setBRepeatDuration] = React.useState(9999);
  const [crossfadingId, setCrossfadingId] = React.useState('');
  const { updateCurrentSongMetadata, updateCurrentSongMetadataReceived } =
    usePlaylistCRUD();
  const track = useTrackStore(state => state.track);
  const updateTrack = useTrackStore(state => state.updateTrack);
  const crossfadeId = useNoxSetting(state => state.crossfadeId);
  const setCrossfadeId = useNoxSetting(state => state.setCrossfadeId);
  const crossfadeInterval = useNoxSetting(
    state => state.playerSetting,
  ).crossfade;
  const loadingTracker = React.useRef(false);

  useTrackPlayerEvents([Event.MetadataCommonReceived], async event => {
    if (
      !track?.song?.metadataOnReceived ||
      Object.keys(event.metadata).length === 0
    )
      return;
    const newMetadata: Partial<NoxMedia.Song> = { metadataOnReceived: false };
    if (event.metadata.artist) newMetadata.singer = event.metadata.artist;
    if (event.metadata.title) {
      newMetadata.name = event.metadata.title;
      newMetadata.parsedName = event.metadata.title;
    }
    if (event.metadata.albumTitle)
      newMetadata.album = event.metadata.albumTitle;
    // @ts-expect-error
    if (event.metadata.albumName)
      // @ts-expect-error
      newMetadata.album = event.metadata.albumName;
    if (event.metadata.artworkUri)
      newMetadata.cover = event.metadata.artworkUri;
    newMetadata.duration = (await TrackPlayer.getProgress()).duration;
    updateTrack(event.metadata);
    updateCurrentSongMetadataReceived({ metadata: newMetadata });
  });

  useTrackPlayerEvents([Event.PlaybackProgressUpdated], async event => {
    const { playmode } = getState();
    saveLastPlayDuration(event.position);
    const currentSongId = track?.song?.id ?? '';
    // prepare for cross fading if enabled, playback is > 50% done and crossfade preparation isnt done
    if (
      crossfadeInterval > 0 &&
      event.position > event.duration * 0.5 &&
      crossfadeId !== currentSongId
    ) {
      logger.debug(
        `[crossfade] preparing crossfade at ${event.position}/${event.duration}`,
      );
      await prepareSkipToNext();
      setCrossfadeId(track?.song?.id ?? '');
      return TrackPlayer.crossFadePrepare();
    }

    // if fade or crossfade should be triggered
    if (event.duration > 0 && playmode !== NoxRepeatMode.RepeatTrack) {
      let trueDuration = Math.min(bRepeatDuration, event.duration);
      if (trueDuration === 0) {
        logger.warn(
          `[crossfade] true duration is 0?! reset to ${event.duration} instead. ${bRepeatDuration}, ${abRepeat}.`,
        );
        setBRepeatDuration(event.duration * abRepeat[1]);
        trueDuration = event.duration;
      }
      if (
        // crossfade req: position is at crossfade interval,
        // crossfade song prepared, not in crossfading
        isAndroid &&
        crossfadeInterval > 0 &&
        event.position > trueDuration - crossfadeInterval &&
        crossfadeId === currentSongId &&
        crossfadingId !== currentSongId
      ) {
        logger.debug(
          `[crossfade] crossfading: ${event.position}, ${trueDuration}, ${crossfadeInterval}`,
        );
        setCrossfadingId(currentSongId);
        setCrossfaded(true);
        return TrackPlayer.crossFade(
          crossfadeInterval * 1000,
          20,
          getR128Gain(track?.song) ?? 1,
        );
      }
      if (
        // fade req: position is at fade interval, not in crossfading
        fadeIntervalSec > 0 &&
        event.position > trueDuration - fadeIntervalSec &&
        crossfadeId !== currentSongId
      ) {
        logger.debug(
          `[FADEOUT] fading out....${event.position} / ${event.duration}`,
        );
        TrackPlayer.setAnimatedVolume({
          volume: 0,
          duration: fadeIntervalMs,
        });
      }
    }
    if (abRepeat[1] === 1) return;
    if (event.position > bRepeatDuration) {
      if (playmode === NoxRepeatMode.RepeatTrack) {
        TrackPlayer.seekTo(abRepeat[0] * event.duration);
        return;
      }
      logger.debug(
        `[ABRepeat] duration ${event.duration} > ${bRepeatDuration}.`,
      );
      performSkipToNext();
    }
  });

  useTrackPlayerEvents([Event.PlaybackState], async event => {
    switch (event.state) {
      case State.Loading:
        loadingTracker.current = true;
        break;
    }
    if (event.state !== State.Ready) return;
    updateCurrentSongMetadata().then(v => {
      if (v) {
        updateTrack({
          ...v,
          artwork: v.cover,
          title: v.name,
          artist: v.singer,
        });
      }
    });
    const { playmode, currentPlayingId } = getState();
    if (!loadingTracker.current || playmode !== NoxRepeatMode.RepeatTrack) {
      return;
    }
    const newABRepeat = getABRepeatRaw(currentPlayingId);
    if (newABRepeat[0] === 0) return;
    loadingTracker.current = false;
    const trackDuration = (await TrackPlayer.getProgress()).duration;
    TrackPlayer.seekTo(trackDuration * newABRepeat[0]);
  });

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async event => {
    const song = event.track?.song as NoxMedia.Song;
    const newABRepeat = getABRepeatRaw(song.id);
    logger.debug(`[SongReady] logging ABRepeat as ${newABRepeat}`);
    setABRepeat(newABRepeat);
    if (setCurrentPlaying(song) && !loadingTracker.current) return;
    loadingTracker.current = false;
    execWhenTrue({
      loopCheck: async () => (await TrackPlayer.getProgress()).duration !== 0,
      executeFn: async () => {
        const trackDuration = (await TrackPlayer.getProgress()).duration;
        setBRepeatDuration(newABRepeat[1] * trackDuration);
        if (newABRepeat[0] === 0) return;
        logger.debug(
          `[ABRepeat] starting at ${trackDuration}, ${newABRepeat[0]}`,
        );
        TrackPlayer.seekTo(trackDuration * newABRepeat[0]);
      },
    });
  });

  return {
    performSkipToNext,
    performSkipToPrevious,
  };
};
