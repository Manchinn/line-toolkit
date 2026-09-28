export interface ClientProfile {
  id: string;
  name: string;
  channelId: string;
  channelSecret?: string;
  channelAccessToken: string;
  notes?: string;
}

export type ActionType = 'message' | 'uri' | 'richmenuswitch' | 'postback';

export interface RichMenuArea {
  id: string;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: {
    type: ActionType;
    label?: string;
    text?: string;       // for message action
    uri?: string;        // for uri action
    richMenuAliasId?: string; // for richmenuswitch
    data?: string;       // for postback or richmenuswitch
  };
}

export interface RichMenuTab {
  id: string;
  title: string;
  aliasId: string;       // e.g. tab-a, tab-b
  selected: boolean;     // default show on bar
  chatBarText: string;   // e.g. 'เมนูหลัก', 'โปรโมชั่น'
  size: {
    width: number;       // default 2500
    height: number;      // 1686 or 843
  };
  imagePreviewUrl?: string; // Base64 data or blob URL
  imageFile?: File;
  areas: RichMenuArea[];
}
