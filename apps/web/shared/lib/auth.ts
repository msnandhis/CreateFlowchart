export interface DevSessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface DevSession {
  user: DevSessionUser;
  session: {
    id: string;
    expiresAt: string;
  };
}

const DEFAULT_DEV_SESSION: DevSession = {
  user: {
    id: "dev-user",
    email: "dev@createflowchart.local",
    name: "Dev User",
    image: null,
  },
  session: {
    id: "dev-session",
    expiresAt: "2099-12-31T23:59:59.000Z",
  },
};

function sessionFromHeaders(headers?: HeadersInit): DevSession {
  const source = new Headers(headers);
  const userId = source.get("x-dev-user-id") ?? DEFAULT_DEV_SESSION.user.id;
  const email = source.get("x-dev-user-email") ?? DEFAULT_DEV_SESSION.user.email;
  const name = source.get("x-dev-user-name") ?? DEFAULT_DEV_SESSION.user.name;

  return {
    user: {
      id: userId,
      email,
      name,
      image: DEFAULT_DEV_SESSION.user.image,
    },
    session: DEFAULT_DEV_SESSION.session,
  };
}

export const auth = {
  api: {
    async getSession(input?: { headers?: HeadersInit }) {
      return sessionFromHeaders(input?.headers);
    },
  },
};

export type Session = DevSession;
export const DEV_SESSION = DEFAULT_DEV_SESSION;
