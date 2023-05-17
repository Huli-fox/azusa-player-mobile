import AsyncStorage from '@react-native-async-storage/async-storage';
import { strToU8, strFromU8, compressSync, decompressSync } from 'fflate';
import { dummyPlaylist } from '../objects/Playlist';
import { notNullDefault } from './Utils';
import { NoxRepeatMode } from '../components/player/enums/RepeatMode';
import { PLAYLIST_ENUMS } from '../enums/Playlist';
/**
 * noxplayer's storage handler.
 * ChromeStorage has quite a few changes from azusa player the chrome extension;
 * mainly to abandon the storageCtxMgr context and use zustand instead.
 * if i'm getting rid of storageCtxMgr there is
 * no point migrating noxplayer storage.js.
 *
 * I will try to make noxplayer's settings compatible but some fields eg. Song.duration
 * are missing.
 */

// see known storage limits:
// https://react-native-async-storage.github.io/async-storage/docs/limits
const MAX_SONGLIST_SIZE = 400;

export enum STORAGE_KEYS {
  PLAYER_SETTING_KEY = 'PlayerSetting',
  FAVORITE_PLAYLIST_KEY = 'FavFavList-Special',
  SEARCH_PLAYLIST_KEY = 'SearchPlaylist-Special',
  LAST_PLAY_LIST = 'LastPlayList',
  FAVLIST_AUTO_UPDATE_TIMESTAMP = 'favListAutoUpdateTimestamp',
  MY_FAV_LIST_KEY = 'MyFavList',
  PLAYMODE_KEY = 'Playmode',
  SKIN = 'PlayerSkin',
  SKINSTORAGE = 'PlayerSkinStorage',
}

export enum EXPORT_OPTIONS {
  LOCAL = '本地',
  DROPBOX = 'Dropbox',
  PERSONAL = '私有云',
}

export const DEFAULT_SETTING: NoxStorage.PlayerSettingDict = {
  autoRSSUpdate: false,
  skin: '诺莺nox',
  parseSongName: false,
  keepSearchedSongListWhenPlaying: false,
  settingExportLocation: EXPORT_OPTIONS.LOCAL,
  personalCloudIP: '',
  noxVersion: 'latest',
  hideCoverInMobile: false,
  loadPlaylistAsArtist: false,
  sendBiliHeartbeat: false,
  noCookieBiliSearch: false,
  playerRepeat: NoxRepeatMode,
  dataSaver: false,
  fastBiliSearch: false,
};

export const saveItem = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(e);
  }
};

export const getItem = async (key: string): Promise<null | any> => {
  try {
    const retrievedStr = await AsyncStorage.getItem(key);
    return retrievedStr === null ? null : JSON.parse(retrievedStr);
  } catch (e) {
    console.error(e);
  }
  return null;
};

export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn(e);
  }
};
/**
 * splits an array to chunks of given size.
 * @param arr
 * @param size
 * @returns
 */
const chunkArray = (
  arr: Array<any>,
  size = MAX_SONGLIST_SIZE
): Array<any[]> => {
  return arr.reduce((chunks, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }
    chunks[chunkIndex].push(item);
    return chunks;
  }, []);
};

/**
 * a generic chunk splitter to store arrays that may exceed 2MB storage limits.
 * see known storage limits:
 * https://react-native-async-storage.github.io/async-storage/docs/limits
 * @param object
 * @param key
 */
const saveChucked = async (
  objects: Array<any>,
  key: string,
  saveToStorage = true
) => {
  // splice into chunks
  const chuckedObject = chunkArray(objects);
  const chuckedIndices = chuckedObject.map((val, index) => `${key}.${index}`);
  chuckedObject.forEach((list, index) => saveItem(chuckedIndices[index], list));
  if (saveToStorage) {
    saveItem(key, chuckedIndices);
    return [];
  } else {
    return chuckedIndices;
  }
};

const loadChucked = async (keys: string[]) => {
  const loadedArrays = (await Promise.all(
    keys.map(async (val: string) => await getItem(val))
  )) as Array<any[]>;
  return loadedArrays.flat();
};
/**
 * playlist can get quite large, my idea is to splice songlist into smaller lists then join them.
 * @param playlist
 * @returns
 */
export const savePlaylist = async (
  playlist: NoxMedia.Playlist,
  overrideKey: string | null = null
) => {
  try {
    const savingPlaylist = {
      ...playlist,
      songList: await saveChucked(playlist.songList, playlist.id, false),
    };
    // save chunks
    saveItem(notNullDefault(overrideKey, playlist.id), savingPlaylist);
  } catch (e) {
    console.error(e);
  }
};

/**
 * note this method always return a playlist, if error occurs a dummy one is
 * returned.
 * @param key playlist ID.
 * @returns
 */
export const getPlaylist = async (key: string): Promise<NoxMedia.Playlist> => {
  try {
    // eslint-disable-next-line prefer-const
    let retrievedPlaylist = await getItem(key);
    if (retrievedPlaylist === null) return dummyPlaylist();
    retrievedPlaylist.songList = await loadChucked(retrievedPlaylist.songList);
    return retrievedPlaylist;
  } catch (e) {
    console.error(e);
  }
  return dummyPlaylist();
};

// no point to provide getters, as states are managed by zustand.
// unlike azusaplayer which the storage context still reads localstorage, instaed
// of keeping them as states.
export const saveSettings = async (setting: NoxStorage.PlayerSettingDict) =>
  saveItem(STORAGE_KEYS.PLAYER_SETTING_KEY, setting);

export const savePlaylistIds = async (val: string[]) =>
  saveItem(STORAGE_KEYS.MY_FAV_LIST_KEY, val);

export const savePlayerSkin = async (val: NoxTheme.style) =>
  saveItem(STORAGE_KEYS.SKIN, val);

export const addPlaylist = async (
  playlist: NoxMedia.Playlist,
  playlistIds: Array<string>
) => {
  playlistIds.push(playlist.id);
  savePlaylist(playlist);
  savePlaylistIds(playlistIds);
  return playlistIds;
};

export const delPlaylist = async (
  playlist: NoxMedia.Playlist,
  playlistIds: Array<string>
) => {
  playlistIds.splice(playlistIds.indexOf(playlist.id), 1);
  removeItem(playlist.id);
  [
    ...Array(Math.ceil(playlist.songList.length / MAX_SONGLIST_SIZE)).keys(),
  ].forEach(index => {
    removeItem(`${playlist.id}.${index}`);
  });
  savePlaylistIds(playlistIds);
  return playlistIds;
};

export const saveFavPlaylist = async (playlist: NoxMedia.Playlist) =>
  savePlaylist(playlist, STORAGE_KEYS.FAVORITE_PLAYLIST_KEY);

export const savelastPlaylistId = async (val: [string, string]) =>
  saveItem(STORAGE_KEYS.LAST_PLAY_LIST, val);

export const savePlayMode = async (val: string) =>
  saveItem(STORAGE_KEYS.PLAYMODE_KEY, val);

export const initPlayerObject =
  async (): Promise<NoxStorage.PlayerStorageObject> => {
    // eslint-disable-next-line prefer-const
    let playerObject = {
      settings: {
        ...DEFAULT_SETTING,
        ...notNullDefault(await getItem(STORAGE_KEYS.PLAYER_SETTING_KEY), {}),
      },
      playlistIds: notNullDefault(
        await getItem(STORAGE_KEYS.MY_FAV_LIST_KEY),
        []
      ),
      playlists: {},
      lastPlaylistId: notNullDefault(
        await getItem(STORAGE_KEYS.LAST_PLAY_LIST),
        ['NULL', 'NULL']
      ),
      searchPlaylist: dummyPlaylist(
        'Search',
        PLAYLIST_ENUMS.TYPE_SEARCH_PLAYLIST
      ),
      favoriPlaylist: notNullDefault(
        await getItem(STORAGE_KEYS.FAVORITE_PLAYLIST_KEY),
        dummyPlaylist('Favorite', PLAYLIST_ENUMS.TYPE_FAVORI_PLAYLIST)
      ),
      playerRepeat: notNullDefault(
        await getItem(STORAGE_KEYS.PLAYMODE_KEY),
        NoxRepeatMode.SHUFFLE
      ),
      skin: notNullDefault(await getItem(STORAGE_KEYS.SKIN), {}),
    } as NoxStorage.PlayerStorageObject;

    playerObject.playlists[STORAGE_KEYS.SEARCH_PLAYLIST_KEY] =
      playerObject.searchPlaylist;
    playerObject.playlists[STORAGE_KEYS.FAVORITE_PLAYLIST_KEY] =
      playerObject.favoriPlaylist;

    await Promise.all(
      playerObject.playlistIds.map(async id => {
        const retrievedPlaylist = await getPlaylist(id);
        if (retrievedPlaylist) playerObject.playlists[id] = retrievedPlaylist;
      })
    );
    return playerObject;
  };

export const clearStorage = async () => await AsyncStorage.clear();

// gzip
export const exportPlayerContent = async () => {
  const allKeys = await AsyncStorage.getAllKeys();
  return compressSync(strToU8(JSON.stringify(allKeys)));
};

export const importPlayerContent = async (content: Uint8Array) => {
  try {
    await AsyncStorage.multiSet(JSON.parse(strFromU8(decompressSync(content))));
    return await initPlayerObject();
  } catch {
    return null;
  }
};

// gzip
export const importPlayerObjectOld = async (
  playerObject: NoxStorage.PlayerStorageObject
) => {
  await clearStorage();
  saveSettings(playerObject.settings);
  savePlaylistIds(playerObject.playlistIds);
  savelastPlaylistId(playerObject.lastPlaylistId);
  saveFavPlaylist(playerObject.favoriPlaylist);
  Object.entries(playerObject.playlists).forEach(val => savePlaylist(val[1]));
};
