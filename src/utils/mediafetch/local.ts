/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * refactor:
 * bilisearch workflow:
 * reExtractSearch matches regex patterns and use the corresponding fetch functions;
 * fetch function takes extracted and calls a dataProcess.js fetch function;
 * dataprocess fetch function fetches VIDEOINFO using data.js fetch function, then parses into SONGS
 * data.js fetch function fetches VIDEOINFO.
 * steps to refactor:
 * each site needs a fetch to parse regex extracted, a videoinfo fetcher and a song fetcher.
 */
import { Platform, NativeModules } from 'react-native';
import RNFetchBlob from 'react-native-blob-util';

import { probeMetadata, cacheAlbumArt } from '@utils/ffmpeg/ffmpeg';
import { SOURCE } from '@enums/MediaFetch';
import { regexFetchProps } from './generic';
import SongTS from '@objects/Song';
import logger from '../Logger';
import { filterUndefined } from '../Utils';
import { singleLimiter } from './throttle';

const { NoxAndroidAutoModule } = NativeModules;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const songFetch = async (
  fpath: string,
  favlist: string[],
  progressEmitter: (val: number) => void = () => undefined
): Promise<NoxMedia.Song[]> => {
  if (Platform.OS !== 'android') return [];
  const mediaFiles = await NoxAndroidAutoModule.listMediaDir(fpath, true);
  const uniqMediaFiles = mediaFiles.filter(
    (v: any) => !favlist.includes(v.realPath)
  );
  return filterUndefined(
    await Promise.all(
      uniqMediaFiles.map(async (v: any, index: number) => {
        let probedMetadata: any = {};
        try {
          probedMetadata = await singleLimiter.schedule(() => {
            progressEmitter((100 * (index + 1)) / uniqMediaFiles.length);
            return probeMetadata(v.realPath);
          });
        } catch (e) {
          logger.warn(e);
          logger.warn(v);
        }
        return SongTS({
          cid: `${SOURCE.local}-${v.realPath}`,
          bvid: `file://${v.realPath}`,
          name: probedMetadata.tags?.title || v.fileName,
          nameRaw: probedMetadata.tags?.title || v.fileName,
          singer: probedMetadata.tags?.artist || '',
          singerId: probedMetadata.tags?.artist || '',
          cover: '',
          lyric: '',
          page: 0,
          duration: Number(probedMetadata.duration) || 0,
          album: probedMetadata.tags?.album || '',
          source: SOURCE.local,
        });
      })
    ),
    v => v
  );
};

const regexFetch = async ({
  reExtracted,
  favList = [],
  progressEmitter,
}: regexFetchProps): Promise<NoxNetwork.NoxRegexFetch> => ({
  songList: await songFetch(reExtracted[1]!, favList, progressEmitter),
});

const resolveURL = async (song: NoxMedia.Song) => {
  let artworkBase64 = '';
  try {
    const artworkURI = await cacheAlbumArt(song.bvid);
    artworkBase64 = await RNFetchBlob.fs.readFile(artworkURI, 'base64');
  } catch (e) {
    logger.warn(`[localResolver] cannot resolve artwork of ${song.bvid}`);
  }
  return { url: song.bvid, cover: `data:image/png;base64,${artworkBase64}` };
};

const refreshSong = (song: NoxMedia.Song) => song;

export default {
  regexSearchMatch: /local:\/\/(.+)/,
  regexFetch,
  regexResolveURLMatch: /^local-/,
  resolveURL,
  refreshSong,
};