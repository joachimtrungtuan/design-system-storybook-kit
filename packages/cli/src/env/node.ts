import { ActionableError } from "../errors.ts";

export interface NodeVersion {
  major: number;
  minor: number;
  patch: number;
}

export const MINIMUM_NODE_VERSION: NodeVersion = {
  major: 24,
  minor: 12,
  patch: 0,
};

export function parseNodeVersion(value: string): NodeVersion | undefined {
  const match = /^(?:v)?(\d+)\.(\d+)\.(\d+)/u.exec(value);
  if (match === null) {
    return undefined;
  }

  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) {
    return undefined;
  }

  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  };
}

export function isSupportedNodeVersion(version: NodeVersion): boolean {
  return (
    version.major > MINIMUM_NODE_VERSION.major ||
    (version.major === MINIMUM_NODE_VERSION.major &&
      (version.minor > MINIMUM_NODE_VERSION.minor ||
        (version.minor === MINIMUM_NODE_VERSION.minor &&
          version.patch >= MINIMUM_NODE_VERSION.patch)))
  );
}

export function assertSupportedNode(value: string = process.versions.node): NodeVersion {
  const version = parseNodeVersion(value);
  if (version === undefined || !isSupportedNodeVersion(version)) {
    throw new ActionableError(
      `Node ${value} is not supported; story-cli-kit requires Node 24.12 or newer.`,
      "Install the current Node 24 LTS release, then run this command again.",
      "https://nodejs.org/en/download",
    );
  }
  return version;
}
