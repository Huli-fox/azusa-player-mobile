import * as React from 'react';
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { useNoxSetting } from '../../hooks/useSetting';
import { loginDropbox } from './sync/DropboxAuth';
import GenericSelectDialog from '../dialogs/GenericSelectDialog';
import { EXPORT_OPTIONS } from '../../enums/Sync';
import PersonalSyncButton from './sync/PersonalSyncButton';

const EXPORT_OPTIONS_LIST = [
  EXPORT_OPTIONS.LOCAL,
  EXPORT_OPTIONS.DROPBOX,
  EXPORT_OPTIONS.PERSONAL,
];

export default () => {
  const { t } = useTranslation();
  const playerStyle = useNoxSetting(state => state.playerStyle);
  const playerSetting = useNoxSetting(state => state.playerSetting);
  const setPlayerSetting = useNoxSetting(state => state.setPlayerSetting);
  const [selectVisible, setSelectVisible] = React.useState(false);
  const renderOption = (option = playerSetting.settingExportLocation) => {
    switch (option) {
      case EXPORT_OPTIONS.LOCAL:
        return t('Sync.Local');
      case EXPORT_OPTIONS.DROPBOX:
        return t('Sync.Dropbox');
      case EXPORT_OPTIONS.PERSONAL:
        return t('Sync.PersonalCloud');
      default:
        return 'ERROR';
    }
  };
  const [currentSelectOption] = React.useState({
    options: EXPORT_OPTIONS_LIST,
    renderOption,
    defaultIndex: EXPORT_OPTIONS_LIST.indexOf(
      playerSetting.settingExportLocation
    ),
    onClose: () => setSelectVisible(false),
    onSubmit: (index: number) => {
      setPlayerSetting({ settingExportLocation: EXPORT_OPTIONS_LIST[index] });
      setSelectVisible(false);
    },
  });

  return (
    <View
      style={{
        backgroundColor: playerStyle.customColors.maskedBackgroundColor,
        flex: 1,
      }}
    >
      <View style={{ height: 10 }}></View>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text variant="bodyLarge" style={{ paddingTop: 6 }}>
          {t('Sync.ExportLocation')}
        </Text>
        <Button onPress={() => setSelectVisible(true)}>{renderOption()}</Button>
      </View>
      <Button onPress={() => loginDropbox().then(console.log)}>GAGAGA</Button>
      {playerSetting.settingExportLocation === EXPORT_OPTIONS.PERSONAL ? (
        <PersonalSyncButton />
      ) : (
        <></>
      )}
      <GenericSelectDialog
        visible={selectVisible}
        options={currentSelectOption.options}
        renderOptionTitle={currentSelectOption.renderOption}
        defaultIndex={currentSelectOption.defaultIndex}
        onClose={currentSelectOption.onClose}
        onSubmit={currentSelectOption.onSubmit}
      />
    </View>
  );
};
