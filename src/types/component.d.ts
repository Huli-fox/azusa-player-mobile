import { StyleProp, ViewStyle } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Track } from 'react-native-track-player';

import { IntentData } from '@enums/Intent';

declare global {
  namespace NoxComponent {
    interface AppProps {
      intentData?: IntentData;
      intentAction: string;
      intentBundle: null | any;
      rootTag: number;
    }
    interface NavigationProps {
      navigation: DrawerNavigationProp<ParamListBase>;
    }
    interface NavigationProps2 {
      navigation?: DrawerNavigationProp<ParamListBase>;
    }

    interface TrackProps {
      track?: Track;
    }
    type ViewStyleProp = StyleProp<ViewStyle>;
  }
  namespace NoxSyncComponent {
    interface ImportProps {
      restoreFromUint8Array: (data: Uint8Array) => Promise<void>;
      noxRestore: () => Promise<any>;
      login: (
        callback: () => any,
        errorHandling: (e: Error) => void,
      ) => Promise<boolean>;
    }

    interface ExportProps {
      noxBackup: (content: Uint8Array) => Promise<any>;
      login: (
        callback: () => any,
        errorHandling: (e: Error) => void,
      ) => Promise<boolean>;
    }

    interface Props {
      restoreFromUint8Array: (data: Uint8Array) => Promise<void>;
      noxRestore: () => Promise<any>;
      noxBackup: (content: Uint8Array) => Promise<any>;
      login: (
        callback: () => any,
        errorHandling: (e: Error) => void,
      ) => Promise<boolean>;
    }

    interface GenericProps {
      restoreFromUint8Array: (data: Uint8Array) => Promise<void>;
    }
  }
}
