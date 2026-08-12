export interface NodeVersion {
    major: number;
    minor: number;
    patch: number;
}
export declare const MINIMUM_NODE_VERSION: NodeVersion;
export declare function parseNodeVersion(value: string): NodeVersion | undefined;
export declare function isSupportedNodeVersion(version: NodeVersion): boolean;
export declare function assertSupportedNode(value?: string): NodeVersion;
