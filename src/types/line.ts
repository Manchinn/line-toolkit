export interface ClientProfile {
  id: string;
  name: string;
  channelId: string;
  channelSecret?: string;
  channelAccessToken: string;
  notes?: string;
}

/** LINE action types supported by the editor. */
export type LineActionType = 'message' | 'uri' | 'richmenuswitch' | 'postback';

/** `none` = area drawn but action not configured yet (never sent to LINE). */
export type ActionType = LineActionType | 'none';

export interface AreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AreaAction {
  type: ActionType;
  label?: string;
  text?: string;            // message
  uri?: string;             // uri
  richMenuAliasId?: string; // richmenuswitch
  data?: string;            // postback / richmenuswitch
  displayText?: string;     // postback
}

export interface RichMenuArea {
  id: string;
  label: string;
  bounds: AreaBounds;
  action: AreaAction;
}

export interface MenuSize {
  width: number;  // 2500 (or legacy 1200/800)
  height: number; // 1686 or 843
}

export interface RichMenuTab {
  id: string;
  title: string;
  aliasId: string;       // e.g. tab-a, tab-b
  selected: boolean;     // default show on bar
  chatBarText: string;   // e.g. 'เมนูหลัก', 'โปรโมชั่น'
  size: MenuSize;
  imagePreviewUrl?: string; // Base64 data or blob URL
  imageFile?: File;
  areas: RichMenuArea[];
}

export interface LineRemoteRichMenu {
  richMenuId: string;
  name: string;
  size: { width: number; height: number };
  selected: boolean;
  chatBarText: string;
  areas: Array<{
    bounds: AreaBounds;
    action: Record<string, unknown>;
  }>;
}

export interface LineRemoteAlias {
  richMenuAliasId: string;
  richMenuId: string;
}

export interface RemoteRichMenuOverview {
  menus: LineRemoteRichMenu[];
  aliases: LineRemoteAlias[];
  defaultMenuId: string | null;
}
