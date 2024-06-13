import { View, FlatList, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { IconButton, Text, TouchableRipple } from 'react-native-paper';

import {
  getAlistCred,
  addAlistCred,
  removeAlistCredAt,
} from '@utils/alist/storage';
import { useNoxSetting } from '@stores/useApp';
import CredDialog from './CredDialog';

export default () => {
  const [credList, setCredList] = useState<NoxStorage.AListCred[]>([]);
  const [currentCred, setCurrentCred] = useState<NoxStorage.AListCred>();
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [rerender, toggleRerender] = useState(false);
  const playerStyle = useNoxSetting(state => state.playerStyle);

  const addCred = (cred: NoxStorage.AListCred) => {
    let parsedCred: NoxStorage.AListCred;
    try {
      parsedCred = [new URL(cred[0]).hostname, cred[1]];
    } catch {
      parsedCred = cred;
    }

    addAlistCred(parsedCred);
    setCredList(credList.concat([parsedCred]));
    setCredDialogOpen(false);
  };

  const removeCred = (index: number) => {
    const newList = credList;
    newList.splice(index, 1);
    // HACK: WTF is this even needed???
    toggleRerender(v => !v);
    removeAlistCredAt(index);
    setCredList(newList);
  };

  useEffect(() => {
    getAlistCred().then(setCredList);
  }, []);

  return (
    <View
      style={{
        backgroundColor: playerStyle.customColors.maskedBackgroundColor,
        flex: 1,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <IconButton
          icon="plus-circle-outline"
          size={45}
          iconColor={playerStyle.colors.primary}
          onPress={() => {
            setCurrentCred(undefined);
            setCredDialogOpen(true);
          }}
        />
      </View>
      <FlatList
        data={credList}
        extraData={rerender}
        renderItem={({ item, index }) => (
          <View style={{ flexDirection: 'row', paddingVertical: 5 }}>
            <TouchableRipple
              style={{ flex: 1, justifyContent: 'center' }}
              onPress={() => {
                setCurrentCred(credList[index]);
                setCredDialogOpen(true);
              }}
            >
              <Text variant="displaySmall">{item[0]}</Text>
            </TouchableRipple>
            <View style={{ justifyContent: 'center' }}>
              <IconButton
                icon={'delete'}
                iconColor={playerStyle.colors.primary}
                size={45}
                onPress={() => removeCred(index)}
              />
            </View>
          </View>
        )}
      />
      <CredDialog
        visible={credDialogOpen}
        cred={currentCred}
        onClose={() => {
          setCredDialogOpen(false);
        }}
        onSubmit={addCred}
      />
    </View>
  );
};