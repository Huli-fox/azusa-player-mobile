import * as React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';

// eslint-disable-next-line import/no-unresolved
import { APPSTORE } from '@env';
import { useNoxSetting } from '@stores/useApp';
import { logStore, LOGLEVEL } from '@utils/Logger';
import GenericSelectDialog from '../dialogs/GenericSelectDialog';
import { SettingListItem, RenderSetting } from './useRenderSetting';
import useVersionCheck from '@hooks/useVersionCheck';
import {
  SelectSettingEntry,
  SettingEntry,
  dummySelectSettingEntry,
} from './SetttingEntries';
import NoxCache from '@utils/Cache';
import useCleanCache from '@hooks/useCleanCache';
import appStore from '@stores/appStore';
import { saveFadeInterval } from '@utils/ChromeStorage';
import GroupView from '../background/GroupView';
import PluginSettings from './plugins/View';
import showLog from './debug/Log';
import { showDebugLog } from './debug/DebugConsole';
import {
  getTakanaDesc,
  disableTanaka,
  enableTanaka,
} from '@hooks/useTanakaAmazingCommodities';
import { isAndroid } from '@utils/RNUtils';

enum Icons {
  setlog = 'console',
  update = 'update',
  showlog = 'bug',
  cache = 'floppy',
  clearcache = 'delete-sweep',
  clearOrphanCache = 'delete-empty',
  crossfade = 'shuffle-variant',
  fade = 'cosine-wave',
  plugins = 'puzzle',
  Tanaka = 'emoticon-devil',
}

enum VIEW {
  HOME = 'Settings',
  PLUGINS = 'Plugins',
}

const Stack = createNativeStackNavigator();

const FadeOptions = [0, 250, 500, 1000];
const CrossFadeOptions = [0, 2500, 5000, 7500, 12000];

const developerSettings: { [key: string]: SettingEntry } = {
  noInterruption: {
    settingName: 'noInterruption',
    settingCategory: 'DeveloperSettings',
    checkbox: true,
  },
  prefetchTrack: {
    settingName: 'prefetchTrack',
    settingCategory: 'GeneralSettings',
  },
  audioOffload: {
    settingName: 'audioOffload',
    settingCategory: 'GeneralSettings',
  },
  parseEmbeddedArtwork: {
    settingName: 'parseEmbeddedArtwork',
    settingCategory: 'GeneralSettings',
  },
  skipSilence: {
    settingName: 'skipSilence',
    settingCategory: 'GeneralSettings',
  },
  memoryEfficiency: {
    settingName: 'memoryEfficiency',
    settingCategory: 'GeneralSettings',
    callback: Sentry.nativeCrash,
  },
  /**
  chatGPTSongName: {
    settingName: 'chatGPTResolveSongName',
    settingCategory: 'GeneralSettings',
  },
   */
};

const { getState, setState } = logStore;

const Home = ({ navigation }: NoxComponent.NavigationProps) => {
  const playerSetting = useNoxSetting(state => state.playerSetting);
  const setPlayerSetting = useNoxSetting(state => state.setPlayerSetting);
  const { t } = useTranslation();
  const [currentSelectOption, setCurrentSelectOption] = React.useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelectSettingEntry<any>
  >(dummySelectSettingEntry);
  const [selectVisible, setSelectVisible] = React.useState(false);
  const playerStyle = useNoxSetting(state => state.playerStyle);
  const { checkVersion } = useVersionCheck();
  const { orphanedCache, cleanOrphanedCache } = useCleanCache();
  const fadeIntervalMs = useStore(appStore, state => state.fadeIntervalMs);

  // HACK: doesnt render on my phone?!
  const logLevelString = [
    t('DeveloperSettings.LogLevel0'),
    t('DeveloperSettings.LogLevel1'),
    t('DeveloperSettings.LogLevel2'),
    t('DeveloperSettings.LogLevel3'),
    t('DeveloperSettings.LogLevel4'),
    t('DeveloperSettings.LogLevel5'),
  ];

  const selectLogLevel = () => {
    setSelectVisible(true);
    setCurrentSelectOption({
      options: [
        LOGLEVEL.DEBUG,
        LOGLEVEL.INFO,
        LOGLEVEL.WARN,
        LOGLEVEL.ERROR,
        LOGLEVEL.CRITICAL,
        LOGLEVEL.NONE,
      ],
      renderOption: (option: number) => logLevelString[option],
      defaultIndex: getState().logLevel,
      onClose: () => setSelectVisible(false),
      onSubmit: (index: number) => {
        setState({ logLevel: index });
        setSelectVisible(false);
      },
      title: t('DeveloperSettings.LogLevelName'),
    } as SelectSettingEntry<number>);
  };

  const selectFade = () => {
    setSelectVisible(true);
    setCurrentSelectOption({
      options: FadeOptions,
      renderOption: (option: number) => String(option),
      defaultIndex: 0,
      onClose: () => setSelectVisible(false),
      onSubmit: (index: number) => {
        saveFadeInterval(FadeOptions[index]).then(Sentry.nativeCrash);
        setSelectVisible(false);
      },
      title: t('DeveloperSettings.FadeTitle'),
    } as SelectSettingEntry<number>);
  };

  const selectCrossFade = () => {
    setSelectVisible(true);
    setCurrentSelectOption({
      options: CrossFadeOptions,
      renderOption: (option: number) => String(option),
      defaultIndex: 0,
      onClose: () => setSelectVisible(false),
      onSubmit: (index: number) => {
        setPlayerSetting({ crossfade: CrossFadeOptions[index] / 1000 }).then(
          Sentry.nativeCrash,
        );
        setSelectVisible(false);
      },
      title: t('DeveloperSettings.crossfadeTitle'),
    } as SelectSettingEntry<number>);
  };

  const selectCacheLevel = () => {
    setSelectVisible(true);
    const options = [
      0, // disabled
      100, // ~500 MB
      200,
      1000, // ~5 GB
      9999, // 50 GB
    ];
    const defaultIndex = options.indexOf(playerSetting.cacheSize);
    setCurrentSelectOption({
      options,
      defaultIndex: defaultIndex > -1 ? defaultIndex : 0,
      onClose: () => setSelectVisible(false),
      onSubmit: (index: number) => {
        setPlayerSetting({ cacheSize: options[index] }).then(
          Sentry.nativeCrash,
        );
        setSelectVisible(false);
      },
      title: t('DeveloperSettings.CacheSizeName'),
    } as SelectSettingEntry<number>);
  };

  return (
    <View
      style={{
        backgroundColor: playerStyle.customColors.maskedBackgroundColor,
        flex: 1,
      }}
    >
      <ScrollView>
        <List.Section>
          <GroupView>
            <View>
              <RenderSetting item={developerSettings.noInterruption} />
              <RenderSetting item={developerSettings.prefetchTrack} />
              {isAndroid && (
                <>
                  <RenderSetting item={developerSettings.audioOffload} />
                  <RenderSetting item={developerSettings.skipSilence} />
                  <RenderSetting
                    item={developerSettings.parseEmbeddedArtwork}
                  />
                </>
              )}
              <RenderSetting item={developerSettings.memoryEfficiency} />
            </View>
          </GroupView>
          <SettingListItem
            icon={Icons.plugins}
            settingName="PluginsSetting"
            onPress={() => navigation.navigate(VIEW.PLUGINS)}
            settingCategory="Settings"
          />
          {!APPSTORE && (
            <SettingListItem
              icon={Icons.update}
              settingName="VersionCheck"
              onPress={() => checkVersion(false)}
              settingCategory="DeveloperSettings"
            />
          )}
          <SettingListItem
            icon={Icons.showlog}
            settingName="DebugLog"
            onPress={showDebugLog}
            settingCategory="DeveloperSettings"
          />
          <SettingListItem
            icon={Icons.showlog}
            settingName="Log"
            onPress={() => showLog()}
            settingCategory="DeveloperSettings"
          />
          <SettingListItem
            icon={Icons.setlog}
            settingName="LogLevel"
            onPress={selectLogLevel}
            settingCategory="DeveloperSettings"
            modifyDescription={val =>
              `${val}: ${logLevelString[getState().logLevel]}`
            }
          />
          <SettingListItem
            icon={Icons.fade}
            settingName="Fade"
            onPress={selectFade}
            settingCategory="DeveloperSettings"
            modifyDescription={val => `${val}: ${fadeIntervalMs}ms`}
          />
          {isAndroid && (
            <SettingListItem
              icon={Icons.crossfade}
              settingName="crossfade"
              onPress={selectCrossFade}
              settingCategory="DeveloperSettings"
              modifyDescription={v =>
                `${v}: ${playerSetting.crossfade * 1000}ms`
              }
            />
          )}
          <SettingListItem
            icon={Icons.cache}
            settingName="CacheSize"
            onPress={selectCacheLevel}
            settingCategory="DeveloperSettings"
            modifyDescription={() =>
              t('DeveloperSettings.CacheSizeDesc2', {
                val: playerSetting.cacheSize,
              })
            }
          />
          <SettingListItem
            icon={Icons.clearcache}
            settingName="ClearCache"
            onPress={NoxCache.noxMediaCache.clearCache}
            settingCategory="DeveloperSettings"
            modifyDescription={() =>
              t('DeveloperSettings.ClearCacheDesc2', {
                val: NoxCache.noxMediaCache.cacheSize() || 0,
              })
            }
          />
          <SettingListItem
            icon={Icons.clearOrphanCache}
            settingName="ClearOrphanedCache"
            onPress={cleanOrphanedCache}
            settingCategory="DeveloperSettings"
            modifyDescription={() =>
              t('DeveloperSettings.ClearOrphanedCacheDesc2', {
                val: orphanedCache.length,
              })
            }
          />
          <SettingListItem
            icon={Icons.Tanaka}
            settingName="Tanaka"
            onPress={async () =>
              Alert.alert(
                t('DeveloperSettings.TanakaName'),
                await getTakanaDesc(),
                [
                  { text: t('Dialog.nullify'), onPress: disableTanaka },
                  { text: t('Dialog.ok'), onPress: enableTanaka },
                ],
                { cancelable: true },
              )
            }
            settingCategory="DeveloperSettings"
          />
        </List.Section>
      </ScrollView>
      <GenericSelectDialog
        visible={selectVisible}
        options={currentSelectOption.options}
        renderOptionTitle={currentSelectOption.renderOption}
        title={currentSelectOption.title}
        defaultIndex={currentSelectOption.defaultIndex}
        onClose={currentSelectOption.onClose}
        onSubmit={currentSelectOption.onSubmit}
      />
    </View>
  );
};

const DevSettingsView = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={VIEW.HOME}
        component={Home}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={VIEW.PLUGINS}
        component={PluginSettings}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default DevSettingsView;
