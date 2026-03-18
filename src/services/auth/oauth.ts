import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import { env } from "../../config/env";
import esriId from "@arcgis/core/identity/IdentityManager";
import esriRequest from "@arcgis/core/request";

let initialized = false;

export const SHARING_URL = `${env.portalUrl}/sharing`;
const SELF_URL = `${env.portalUrl}/sharing/rest/community/self`;

export interface AuthProfile {
  username: string | null;
  fullName: string | null;
  email: string | null;
}

export function initializeOAuth(): void {
  if (initialized) return;

  const info = new OAuthInfo({
    appId: env.oauthAppId,
    portalUrl: env.portalUrl,
    popup: false,
  });

  esriId.registerOAuthInfos([info]);
  initialized = true;
}

export async function signIn() {
  initializeOAuth();
  return esriId.getCredential(SHARING_URL);
}

export function signOut(): void {
  esriId.destroyCredentials();
  window.location.reload();
}

export async function isAuthenticated(): Promise<boolean> {
  initializeOAuth();

  try {
    await esriId.checkSignInStatus(SHARING_URL);
    return true;
  } catch {
    return false;
  }
}

export function getCurrentUserName(): string | null {
  initializeOAuth();
  const credential = esriId.findCredential(SHARING_URL);
  return credential?.userId ?? null;
}

export async function getCurrentUserProfile(): Promise<AuthProfile> {
  initializeOAuth();

  try {
    const response = await esriRequest(SELF_URL, {
      query: {
        f: "json",
      },
      responseType: "json",
    });

    const data = response.data as {
      username?: string;
      fullName?: string;
      email?: string;
    };

    return {
      username: data.username ?? getCurrentUserName(),
      fullName: data.fullName ?? null,
      email: data.email ?? null,
    };
  } catch {
    return {
      username: getCurrentUserName(),
      fullName: null,
      email: null,
    };
  }
}