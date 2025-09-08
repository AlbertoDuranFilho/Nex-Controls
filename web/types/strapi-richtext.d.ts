declare module "@strapi/blocks-react-renderer" {
  import * as React from "react";

  export type RootNode =
    | {
        type: "text";
        text: string;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        code?: boolean;
      }
    | {
        type: string; // paragraph, list, heading, image etc
        children: RootNode[];
        [key: string]: unknown;
      };

  export interface BlocksRendererProps {
    content: RootNode[];
  }

  export const BlocksRenderer: React.FC<BlocksRendererProps>;
}