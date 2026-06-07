import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

export function createGoogleOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function buildGoogleAuthUrl(state: string): string {
  const client = createGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

export async function exchangeGoogleCode(authCode: string) {
  const client = createGoogleOAuthClient();

  try {
    const { tokens } = await client.getToken(authCode);
    return tokens;
  } catch (error) {
    const googleError = error as {
      message?: string;
      response?: { data?: { error?: string; error_description?: string } };
    };
    const errorCode = googleError.response?.data?.error;
    const description = googleError.response?.data?.error_description;

    if (errorCode === 'invalid_client') {
      throw new Error(
        description ??
          'Invalid Google OAuth client. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env.',
      );
    }

    throw new Error(description ?? googleError.message ?? 'Google token exchange failed');
  }
}

export async function verifyGoogleIdToken(idToken: string) {
  const client = createGoogleOAuthClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
