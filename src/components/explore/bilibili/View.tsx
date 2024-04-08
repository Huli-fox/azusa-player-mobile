import * as React from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { chunkArray } from '@utils/Utils';
import { fetchDynamic } from '@utils/mediafetch/biliDynamic';
import { fetchRanking } from '@utils/mediafetch/biliRanking';
import { styles } from '@components/style';
import { useNoxSetting } from '@stores/useApp';
import usePlayback from '@hooks/usePlayback';
import { ViewEnum } from '@enums/View';

interface BiliCatSongs {
  [key: number]: NoxMedia.Song[];
}

interface BiliSongCardProp {
  songs: NoxMedia.Song[];
  title?: string;
  totalSongs?: NoxMedia.Song[];
}

const BiliSongRow = ({ songs = [], title, totalSongs }: BiliSongCardProp) => {
  const navigationGlobal = useNavigation();
  const playerStyle = useNoxSetting(state => state.playerStyle);
  const { playAsSearchList } = usePlayback();

  const fontColor = playerStyle.metaData.darkTheme ? 'white' : 'black';

  return (
    <View
      style={{
        width: Dimensions.get('window').width,
        paddingRight: 10,
        paddingLeft: 5,
      }}
    >
      {title && (
        <Text style={{ fontSize: 20, color: fontColor, paddingBottom: 5 }}>
          {title}
        </Text>
      )}
      <FlatList
        showsHorizontalScrollIndicator={false}
        data={songs}
        horizontal
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 5, flex: 1 }}>
            <TouchableOpacity
              onPress={() => {
                navigationGlobal.navigate(ViewEnum.PLAYER_PLAYLIST as never);
                playAsSearchList({ songs: totalSongs || songs, song: item });
              }}
            >
              <Image
                style={{ width: 140, height: 140, borderRadius: 5 }}
                source={{ uri: item.cover }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: fontColor,
                    paddingLeft: 5,
                    width: 140,
                  }}
                  variant="titleMedium"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: 'grey', paddingLeft: 5, width: 140 }}
                  variant="titleSmall"
                  numberOfLines={1}
                >
                  {item.singer}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const BiliSongCard = ({ songs = [], title, totalSongs }: BiliSongCardProp) => {
  const navigationGlobal = useNavigation();
  const playerStyle = useNoxSetting(state => state.playerStyle);
  const { playAsSearchList } = usePlayback();

  const fontColor = playerStyle.metaData.darkTheme ? 'white' : 'black';

  return (
    <View
      style={{
        width: Dimensions.get('window').width * 0.8,
        height: 390,
        paddingRight: 10,
        paddingLeft: 5,
      }}
    >
      {title && <Text style={{ fontSize: 20, color: fontColor }}>{title}</Text>}
      <FlatList
        showsVerticalScrollIndicator={false}
        data={songs}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10 }}>
            <TouchableOpacity
              style={{ height: 70, flexDirection: 'row' }}
              onPress={() => {
                navigationGlobal.navigate(ViewEnum.PLAYER_PLAYLIST as never);
                playAsSearchList({ songs: totalSongs || songs, song: item });
              }}
            >
              <Image
                style={{ width: 70, height: 70, borderRadius: 5 }}
                source={{ uri: item.cover }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: fontColor,
                    paddingLeft: 5,
                    flex: 1,
                  }}
                  variant="titleMedium"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: 'grey', paddingLeft: 5 }}
                  variant="titleSmall"
                  numberOfLines={1}
                >
                  {item.singer}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const BiliSongCatsCard = ({ songs = {} }: { songs?: BiliCatSongs }) => {
  const { t } = useTranslation();

  return (
    <View>
      <Text style={{ fontSize: 20, paddingLeft: 5, paddingBottom: 10 }}>
        {t('BiliCategory.ranking')}
      </Text>
      <ScrollView
        horizontal
        disableIntervalMomentum
        snapToInterval={Dimensions.get('window').width * 0.8}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {Object.keys(songs).map(k => (
          <BiliSongCard
            key={k}
            title={t(`BiliCategory.${k}`)}
            songs={songs[Number(k)]}
          />
        ))}
        <View style={{ width: Dimensions.get('window').width * 0.2 }}></View>
      </ScrollView>
    </View>
  );
};

const BiliSongsTabCard = ({
  songs = {},
  title,
}: {
  songs?: BiliCatSongs;
  title: string;
}) => {
  const concatSongs = Object.values(songs).reduce(
    (acc, curr) => acc.concat(curr),
    []
  );
  const splicedSongs: NoxMedia.Song[][] = chunkArray(concatSongs, 4);

  return (
    <View>
      <Text style={{ fontSize: 20, paddingLeft: 5, paddingBottom: 10 }}>
        {title}
      </Text>
      <ScrollView
        horizontal
        disableIntervalMomentum
        snapToInterval={Dimensions.get('window').width * 0.8}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {splicedSongs.map((k, i) => (
          <BiliSongCard
            key={`BiliRankTab${i}`}
            songs={k}
            totalSongs={concatSongs}
          />
        ))}
        <View style={{ width: Dimensions.get('window').width * 0.2 }}></View>
      </ScrollView>
    </View>
  );
};

export default () => {
  const { t } = useTranslation();
  const [biliDynamic, setBiliDynamic] = React.useState<BiliCatSongs>({});
  const [biliRanking, setBiliRanking] = React.useState<BiliCatSongs>({});
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const initData = async () =>
    Promise.all([
      fetchRanking().then(setBiliRanking),
      fetchDynamic().then(setBiliDynamic),
    ]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    initData().then(() => setRefreshing(false));
  }, []);

  React.useEffect(() => {
    if (!loading) return;
    initData().then(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.flex}>
        <Text style={{ fontSize: 50, color: 'white' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ paddingHorizontal: 5, fontSize: 20 }}>
        Bilibili experimental discover page
      </Text>
      <BiliSongsTabCard songs={biliRanking} title={t('BiliCategory.ranking')} />
      {Object.keys(biliDynamic).map((k, i) => (
        <BiliSongRow
          key={`BiliDynamicRow${i}`}
          songs={biliDynamic[Number(k)]}
          title={t(`BiliCategory.${k}`)}
        />
      ))}
    </ScrollView>
  );
};
