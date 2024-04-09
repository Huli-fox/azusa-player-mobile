import { Platform } from 'react-native';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { useTranslation } from 'react-i18next';

import { useNoxSetting } from '@stores/useApp';
import { randomChoice } from '../utils/Utils';
import logger from '../utils/Logger';
import {
  clearPlaylistUninterrupted,
  playSongUninterrupted,
  playSongInterrupted,
} from '@utils/RNTPUtils';
import { NoxRepeatMode } from '@enums/RepeatMode';
import noxPlayingList, { setPlayingIndex } from '@stores/playingList';
import noxCache, { noxCacheKey } from '@utils/Cache';
import useDataSaver from './useDataSaver';

const PLAYLIST_MEDIAID = 'playlist-';

const { getState } = noxPlayingList;

const dataSaverPlaylist = (playlist: NoxMedia.Playlist) => {
  const newSongList = playlist.songList.filter(
    song => noxCache.noxMediaCache?.peekCache(song) !== undefined
  );
  return newSongList.length === 0
    ? playlist
    : { ...playlist, songList: newSongList };
};

const dataSaverPlaylistWrapper = (datasave = true) => {
  return datasave
    ? dataSaverPlaylist
    : (playlist: NoxMedia.Playlist) => playlist;
};

const usePlayback = () => {
  const { t } = useTranslation();
  const currentPlayingList = useNoxSetting(state => state.currentPlayingList);
  const playlistIds = useNoxSetting(state => state.playlistIds);
  const playlists = useNoxSetting(state => state.playlists);
  const currentPlayingId = useNoxSetting(state => state.currentPlayingId);
  const searchPlaylist = useNoxSetting(state => state.searchPlaylist);
  const setCurrentPlaylist = useNoxSetting(state => state.setCurrentPlaylist);
  const setSearchPlaylist = useNoxSetting(state => state.setSearchPlaylist);
  const setCurrentPlayingId = useNoxSetting(state => state.setCurrentPlayingId);
  const setCurrentPlayingList = useNoxSetting(
    state => state.setCurrentPlayingList
  );
  const { isDataSaving } = useDataSaver();

  const playFromPlaylist = async ({
    playlist,
    song,
    interruption = false,
    playlistParser = dataSaverPlaylistWrapper(false),
  }: PlayFromPlaylist) => {
    playlist = playlistParser(playlist);
    setCurrentPlayingList(playlist);
    if (getState().playmode === NoxRepeatMode.RepeatTrack) {
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    }
    if (song === undefined) {
      if (playlist.songList.length === 0) {
        // no song exists.
        logger.warn(`[Playback] ${playlist.id} is empty.`);
        await TrackPlayer.reset();
        return;
      } else {
        song = randomChoice(playlist.songList);
      }
    }
    setPlayingIndex(0, song.id);
    // HACK: track?.song? is somehow updated already here
    // TODO: fix this
    setCurrentPlayingId(song.id);
    if (interruption) {
      return await playSongInterrupted(song);
    }
    if (currentPlayingId !== song.id) {
      await playSongUninterrupted(song);
    }
    clearPlaylistUninterrupted();
  };

  const playAsSearchList = async ({
    songs,
    title = String(t('PlaylistsDrawer.SearchListTitle')),
    song,
  }: PlayAsSearchList) => {
    const newSearchPlaylist = {
      ...searchPlaylist,
      title,
      songList: songs,
    };
    setSearchPlaylist(newSearchPlaylist);
    await playFromPlaylist({ playlist: newSearchPlaylist, song });
    setCurrentPlaylist(newSearchPlaylist);
  };

  const shuffleAll = async () => {
    console.log(playlistIds, playlists);
    let allSongs = playlistIds.reduce(
      (acc, curr) => acc.concat(playlists[curr].songList),
      [] as NoxMedia.Song[]
    );
    if (isDataSaving) {
      const cachedSongs = Array.from(noxCache.noxMediaCache.cache.keys());
      allSongs = allSongs.filter(song =>
        cachedSongs.includes(noxCacheKey(song))
      );
    }
    playAsSearchList({
      songs: allSongs,
      title: String(t('PlaylistOperations.all')),
    });
  };

  const playFromMediaId = (mediaId: string) => {
    logger.info(`[playFromMediaId]: ${mediaId}`);
    if (mediaId.startsWith(PLAYLIST_MEDIAID)) {
      mediaId = mediaId.substring(PLAYLIST_MEDIAID.length);
      // play a playlist.
      if (playlists[mediaId] === undefined) {
        logger.warn(`[Playback] ${mediaId} doesnt exist.`);
        return;
      }
      playFromPlaylist({
        playlist: playlists[mediaId],
        playlistParser: dataSaverPlaylistWrapper(isDataSaving),
      });
    } else {
      // mediaId should follow the format of ${NoxMedia.Song.bvid}|${NoxMedia.Song.id}
      const regexMatch = /([^|]+)\|([^|]+)/.exec(mediaId);
      if (regexMatch === null) {
        logger.warn(`[playFromMediaId]: ${mediaId} is not valid.`);
        return;
      }
      const [, songBVID, songCID] = regexMatch;
      for (const song of currentPlayingList.songList) {
        if (song.bvid === songBVID && song.id === songCID) {
          playFromPlaylist({
            playlist: currentPlayingList,
            song,
            playlistParser: dataSaverPlaylistWrapper(isDataSaving),
          });
          return;
        }
      }
      for (const playlist of Object.values(playlists)) {
        for (const song of playlist.songList) {
          if (song.bvid === songBVID && song.id === songCID) {
            playFromPlaylist({
              playlist,
              song,
              playlistParser: dataSaverPlaylistWrapper(isDataSaving),
            });
            return;
          }
        }
      }
      logger.warn(`[playFromMediaId]: ${mediaId} does not exist.`);
    }
  };

  const playFromSearch = (query: string) => {
    // first go through the current playlist and match the exact song name with query.
    // then go through the current playlist and match the loose song name with query.
    // then go through playlist names and match the exact playlist name with query.
    // then go through every playlist and match the loose song name with query.
    if (query === '') {
      playFromPlaylist({
        playlist: playlists[randomChoice(Object.keys(playlists))],
      });
      return;
    }
    for (const song of currentPlayingList.songList) {
      if (song.name.toLowerCase() === query) {
        playFromPlaylist({ playlist: currentPlayingList, song });
        return;
      }
    }
    for (const song of currentPlayingList.songList) {
      if (song.name.toLowerCase().includes(query)) {
        playFromPlaylist({ playlist: currentPlayingList, song });
        return;
      }
    }
    for (const playlist of Object.values(playlists)) {
      if (playlist.title.toLowerCase() === query) {
        playFromPlaylist({ playlist });
        return;
      }
    }
    for (const playlist of Object.values(playlists)) {
      for (const song of playlist.songList) {
        if (song.name.toLowerCase().includes(query)) {
          playFromPlaylist({ playlist, song });
          return;
        }
      }
    }
  };

  const buildBrowseTree = () => {
    if (Platform.OS !== 'android') return;
    TrackPlayer.setBrowseTree({
      '/': [
        {
          mediaId: 'PlaylistTab',
          title: t('AndroidAuto.PlaylistTab'),
          playable: '1',
        },
      ],
      PlaylistTab: Object.keys(playlists).map(key => {
        return {
          mediaId: `${PLAYLIST_MEDIAID}${key}`,
          title: playlists[key].title,
          playable: '0',
        };
      }),
    });
  };

  return {
    buildBrowseTree,
    playFromMediaId,
    playFromSearch,
    playFromPlaylist,
    shuffleAll,
    playAsSearchList,
  };
};
export default usePlayback;

interface PlayFromPlaylist {
  playlist: NoxMedia.Playlist;
  song?: NoxMedia.Song;
  interruption?: boolean;
  playlistParser?: (playlist: NoxMedia.Playlist) => NoxMedia.Playlist;
}

interface PlayAsSearchList {
  songs: NoxMedia.Song[];
  title?: string;
  song?: NoxMedia.Song;
}
