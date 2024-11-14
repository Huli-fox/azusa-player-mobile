import {
  Platform,
  PermissionsAndroid,
  NativeModules,
  Dimensions,
} from 'react-native';
import RNFetchBlob from 'react-native-blob-util';
import * as DocumentPicker from 'expo-document-picker';

export const isAndroid = Platform.OS === 'android';
export const isAndroid15 = isAndroid && Number(Platform.Version) >= 35;
export const isAndroid10 = isAndroid && Number(Platform.Version) >= 29;
export const isIOS = Platform.OS === 'ios';
const { NoxModule } = NativeModules;

export const getFileSize = async (fpath: string) => {
  try {
    return await RNFetchBlob.fs.stat(fpath);
  } catch {
    return { size: 0 };
  }
};

export enum FilePickerResult {
  NoPermission = 'NoPermission',
  UserCancel = 'UserCancel',
  Success = 'Success',
}

interface FilePickerSuccess {
  reason: FilePickerResult.Success;
  uri: string;
  parsedURI: string;
}

interface FilePickerFail {
  reason: FilePickerResult.NoPermission | FilePickerResult.UserCancel;
}

const chooseLocalFileAndroid = async (
  type = 'audio/*',
): Promise<FilePickerSuccess | FilePickerFail> => {
  const androidPermission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
  );
  if (androidPermission !== PermissionsAndroid.RESULTS.GRANTED) {
    return { reason: FilePickerResult.NoPermission };
  }
  const selectedFile = (
    await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
      type,
    })
  ).assets;
  if (!selectedFile) return { reason: FilePickerResult.UserCancel };
  const uri = selectedFile[0].uri;
  return {
    reason: FilePickerResult.Success,
    uri,
    parsedURI: decodeURIComponent(uri.substring(uri.lastIndexOf('%3A') + 3)),
  };
};

const getMediaRealPath = async (uri: string, parsedURI: string) => {
  const mediaFiles = await NoxModule.listMediaFileByFName(
    uri.substring(uri.lastIndexOf('%2F') + 3),
    parsedURI.substring(0, parsedURI.lastIndexOf('/')),
  );
  return mediaFiles[0].realPath;
};

const getFolderPath = (path: string) =>
  path.substring(0, path.lastIndexOf('/'));

export const chooseLocalMediaFolderAndroid = async (realPath = false) => {
  const location = await chooseLocalFileAndroid();
  if (location.reason !== FilePickerResult.Success) return location;
  if (Number.isNaN(Number.parseInt(location.parsedURI))) {
    return {
      reason: FilePickerResult.Success,
      relativePath: getFolderPath(location.parsedURI),
      realPath: realPath
        ? getFolderPath(
            await getMediaRealPath(location.uri, location.parsedURI),
          )
        : undefined,
    };
  }
  const mediaFiles = await NoxModule.listMediaFileByID(
    location.uri.substring(location.uri.lastIndexOf('%3A') + 3),
    '',
  );
  return {
    reason: FilePickerResult.Success,
    relativePath: mediaFiles[0].relativePath,
    realPath: getFolderPath(mediaFiles[0].realPath),
  };
};

export const validateFile = async (fpath?: string | null) => {
  return fpath && (await RNFetchBlob.fs.exists(fpath)) ? true : false;
};
