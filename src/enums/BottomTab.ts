import { NoxRoutes } from './Routes';

export enum BottomTabRouteIcons {
  playlist = 'playlist-music',
  music = 'music-note',
  explore = 'compass',
  setting = 'cog',
}

type IconMapType = {
  [key in NoxRoutes]: BottomTabRouteIcons;
};

export const IconMap: IconMapType = {
  [NoxRoutes.PlayerHome]: BottomTabRouteIcons.music,
  [NoxRoutes.Settings]: BottomTabRouteIcons.setting,
  [NoxRoutes.Explore]: BottomTabRouteIcons.explore,
  [NoxRoutes.Playlist]: BottomTabRouteIcons.music,
  [NoxRoutes.PlayerCover]: BottomTabRouteIcons.music,
  [NoxRoutes.UserLogin]: BottomTabRouteIcons.music,
  [NoxRoutes.PlaylistsDrawer]: BottomTabRouteIcons.playlist,
  [NoxRoutes.Lyrics]: BottomTabRouteIcons.music,
};
