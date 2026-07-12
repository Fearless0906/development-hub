import axios, { AxiosError } from "axios";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");
const TOKEN_KEY = "cds_django_token";
const REFRESH_TOKEN_KEY = "cds_django_refresh_token";
export const AUTH_EXPIRED_EVENT = "django-auth-expired";

const apiErrorMessage = (body: any, fallback: string) => {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (typeof body.detail === "string") return body.detail;

  const firstError = Object.values(body)
    .flat()
    .find((value) => typeof value === "string");
  return typeof firstError === "string" ? firstError : fallback;
};

type ApiResult<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};
type Filter = { type: "eq" | "in" | "ilike"; field: string; value: unknown };
export type OAuthProvider = "google" | "github";

export const API_ENDPOINTS = {
  profiles: "accounts/auth/users",
  user_roles: "user-roles",
  tags: "tags",
  questions: "questions",
  question_tags: "question-tags",
  answers: "answers",
  votes: "votes",
  code_snippets: "code-snippets",
  snippet_tags: "snippet-tags",
  bookmarks: "bookmarks",
  notifications: "notifications",
  courses: "courses",
  course_modules: "course-modules",
  lessons: "lessons",
  user_course_progress: "course-progress",
  user_quiz_attempts: "quiz-attempts",
  user_challenge_completions: "challenge-completions",
  user_lesson_notes: "lesson-notes",
  course_reviews: "course-reviews",
  course_certificates: "course-certificates",
  auth: {
    register: "accounts/auth/users",
    me: "accounts/auth/users/me",
    login: "accounts/auth/jwt/create",
    refresh: "accounts/auth/jwt/refresh",
  },
} as const;

const endpoints: Record<string, string> = {
  profiles: API_ENDPOINTS.profiles,
  user_roles: API_ENDPOINTS.user_roles,
  tags: API_ENDPOINTS.tags,
  questions: API_ENDPOINTS.questions,
  question_tags: API_ENDPOINTS.question_tags,
  answers: API_ENDPOINTS.answers,
  votes: API_ENDPOINTS.votes,
  code_snippets: API_ENDPOINTS.code_snippets,
  snippet_tags: API_ENDPOINTS.snippet_tags,
  bookmarks: API_ENDPOINTS.bookmarks,
  notifications: API_ENDPOINTS.notifications,
  courses: API_ENDPOINTS.courses,
  course_modules: API_ENDPOINTS.course_modules,
  lessons: API_ENDPOINTS.lessons,
  user_course_progress: API_ENDPOINTS.user_course_progress,
  user_quiz_attempts: API_ENDPOINTS.user_quiz_attempts,
  user_challenge_completions: API_ENDPOINTS.user_challenge_completions,
  user_lesson_notes: API_ENDPOINTS.user_lesson_notes,
  course_reviews: API_ENDPOINTS.course_reviews,
  course_certificates: API_ENDPOINTS.course_certificates,
};

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as typeof error.config & { _retry?: boolean };
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (
      error.response?.status === 401 &&
      request &&
      !request._retry &&
      refreshToken
    ) {
      request._retry = true;
      try {
        const response = await axios.post(
          `${API_URL}/${API_ENDPOINTS.auth.refresh}/`,
          {
            refresh: refreshToken,
          },
        );
        localStorage.setItem(TOKEN_KEY, response.data.access);
        request.headers.Authorization = `Bearer ${response.data.access}`;
        return http.request(request);
      } catch {
        // The refresh token is no longer valid; clear the stale browser session.
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

const relationFields = new Set([
  "user",
  "question",
  "course",
  "module",
  "lesson",
  "tag",
  "snippet",
  "actor",
  "last_lesson",
]);

const normalizeRow = (row: any): any => {
  if (!row || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map(normalizeRow);

  const result = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeRow(value)]),
  );
  for (const field of relationFields) {
    if (field in row) result[`${field}_id`] = row[field];
  }
  return result;
};

const requestPayload = (value: any) => {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value || {})) {
    const base = key.endsWith("_id") ? key.slice(0, -3) : key;
    result[relationFields.has(base) ? base : key] = item;
  }
  return result;
};

const fetchJson = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await http.request({
      url: url.replace(`${API_URL}/`, ""),
      method: options.method || "GET",
      data:
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body,
      headers: options.headers as Record<string, string> | undefined,
    });
    return response.data ?? null;
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    const body = axiosError.response?.data;
    throw new Error(apiErrorMessage(body, axiosError.message));
  }
};

class DjangoQuery<T = any> implements PromiseLike<ApiResult<T>> {
  private filters: Filter[] = [];
  private orders: { field: string; ascending: boolean }[] = [];
  private maxRows?: number;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private values: any;
  private one: "single" | "maybe" | null = null;
  private countOnly = false;
  private conflictFields: string[] = [];

  constructor(private table: string) {}
  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    this.countOnly = Boolean(options?.head);
    return this;
  }
  insert(values: any) {
    this.mode = "insert";
    this.values = values;
    return this;
  }
  update(values: any) {
    this.mode = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  upsert(values: any, options?: { onConflict?: string }) {
    this.mode = "upsert";
    this.values = values;
    this.conflictFields = options?.onConflict?.split(",") || [];
    return this;
  }
  eq(field: string, value: unknown) {
    this.filters.push({ type: "eq", field, value });
    return this;
  }
  in(field: string, value: unknown[]) {
    this.filters.push({ type: "in", field, value });
    return this;
  }
  ilike(field: string, value: string) {
    this.filters.push({ type: "ilike", field, value });
    return this;
  }
  or(_expression: string) {
    return this;
  }
  match(values: Record<string, unknown>) {
    Object.entries(values).forEach(([key, value]) => this.eq(key, value));
    return this;
  }
  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending ?? true });
    return this;
  }
  limit(value: number) {
    this.maxRows = value;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  private matches(row: any) {
    return this.filters.every(({ type, field, value }) => {
      const actual = row[field];
      if (type === "eq") return String(actual) === String(value);
      if (type === "in")
        return (value as unknown[]).map(String).includes(String(actual));
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(value).replaceAll("%", "").toLowerCase());
    });
  }

  private async listRows() {
    const endpoint = endpoints[this.table];
    if (!endpoint)
      throw new Error(`No Django endpoint configured for ${this.table}`);
    const body = await fetchJson(`${API_URL}/${endpoint}/`);
    let rows = (Array.isArray(body) ? body : body?.results || [])
      .map(normalizeRow)
      .filter((row: any) => this.matches(row));
    for (const order of this.orders.reverse()) {
      rows.sort(
        (a: any, b: any) =>
          (a[order.field] > b[order.field] ? 1 : -1) *
          (order.ascending ? 1 : -1),
      );
    }
    if (this.maxRows !== undefined) rows = rows.slice(0, this.maxRows);
    return rows;
  }

  private async execute(): Promise<ApiResult<any>> {
    try {
      const endpoint = endpoints[this.table];
      if (!endpoint)
        throw new Error(`No Django endpoint configured for ${this.table}`);

      if (this.mode === "select") {
        const rows = await this.listRows();
        if (this.countOnly)
          return { data: null, error: null, count: rows.length };
        if (this.one) {
          if (rows.length === 0 && this.one === "single")
            throw new Error("Record not found");
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }

      if (this.mode === "insert") {
        const many = Array.isArray(this.values);
        const values = many ? this.values : [this.values];
        const created = [];
        for (const value of values) {
          created.push(
            normalizeRow(
              await fetchJson(`${API_URL}/${endpoint}/`, {
                method: "POST",
                body: JSON.stringify(requestPayload(value)),
              }),
            ),
          );
        }
        return { data: many ? created : created[0], error: null };
      }

      let rows = await this.listRows();
      if (this.mode === "upsert" && this.conflictFields.length) {
        const conflictValues = requestPayload(this.values);
        const all = await fetchJson(`${API_URL}/${endpoint}/`);
        rows = (Array.isArray(all) ? all : all?.results || [])
          .map(normalizeRow)
          .filter((row: any) =>
            this.conflictFields.every(
              (field) =>
                String(row[field]) === String((this.values as any)[field]),
            ),
          );
        if (rows.length === 0) {
          const created = normalizeRow(
            await fetchJson(`${API_URL}/${endpoint}/`, {
              method: "POST",
              body: JSON.stringify(conflictValues),
            }),
          );
          return { data: created, error: null };
        }
      }

      const changed = [];
      for (const row of rows) {
        const url = `${API_URL}/${endpoint}/${row.id}/`;
        if (this.mode === "delete") await fetchJson(url, { method: "DELETE" });
        else
          changed.push(
            normalizeRow(
              await fetchJson(url, {
                method: "PATCH",
                body: JSON.stringify(requestPayload(this.values)),
              }),
            ),
          );
      }
      return { data: this.one ? (changed[0] ?? null) : changed, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        count: null,
      };
    }
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export type AuthUser = {
  id: string;
  email: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  user_metadata: Record<string, any>;
};
export type AuthSession = {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
};
let currentSession: AuthSession | null = null;
const listeners = new Set<
  (event: string, session: AuthSession | null) => void
>();

const toAuthUser = (user: any): AuthUser => ({
  id: String(user.id),
  email: user.email,
  is_staff: Boolean(user.is_staff),
  is_superuser: Boolean(user.is_superuser),
  user_metadata: {
    username: user.username,
    avatar_url: user.avatar_url,
    full_name: user.display_name,
    is_staff: Boolean(user.is_staff),
    is_superuser: Boolean(user.is_superuser),
  },
});

const loadSession = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const user = await fetchJson(`${API_URL}/${API_ENDPOINTS.auth.me}/`);
    return { user: toAuthUser(user), access_token: token };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return null;
  }
};

export const api = {
  from: (table: string) => new DjangoQuery(table),
  auth: {
    onAuthStateChange(
      callback: (event: string, session: AuthSession | null) => void,
    ) {
      listeners.add(callback);
      return {
        data: {
          subscription: { unsubscribe: () => listeners.delete(callback) },
        },
      };
    },
    async getSession() {
      currentSession = await loadSession();
      return { data: { session: currentSession } };
    },
    async signUp({ email, password, options }: any) {
      try {
        const name = options?.data?.username || email.split("@")[0];
        await fetchJson(`${API_URL}/${API_ENDPOINTS.auth.register}/`, {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            re_password: password,
            first_name: name,
            last_name: name,
          }),
        });
        return await this.signInWithPassword({ email, password });
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
    async signInWithPassword({ email, password }: any) {
      try {
        const tokens = await fetchJson(
          `${API_URL}/${API_ENDPOINTS.auth.login}/`,
          { method: "POST", body: JSON.stringify({ email, password }) },
        );
        localStorage.setItem(TOKEN_KEY, tokens.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
        const user = await fetchJson(`${API_URL}/${API_ENDPOINTS.auth.me}/`);
        currentSession = {
          user: toAuthUser(user),
          access_token: tokens.access,
          refresh_token: tokens.refresh,
        };
        listeners.forEach((listener) => listener("SIGNED_IN", currentSession));
        return {
          data: { session: currentSession, user: currentSession.user },
          error: null,
        };
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
    async signInWithOAuth({
      provider,
      options,
    }: {
      provider: OAuthProvider;
      options: {
        redirectTo: string;
      };
    }) {
      try {
        const endpoint =
          provider === "google"
            ? "accounts/auth/o/google-oauth2"
            : "accounts/auth/o/github";

        const url = new URL(`${API_URL}/${endpoint}/`);

        url.searchParams.set("redirect_uri", options.redirectTo);

        const response = await axios.get<{
          authorization_url: string;
        }>(url.toString(), {
          withCredentials: true,
          headers: {
            Accept: "application/json",
          },
        });

        window.location.assign(response.data.authorization_url);

        return {
          data: null,
          error: null,
        };
      } catch (error) {
        const axiosError = error as AxiosError<any>;

        if (axiosError.code === "ERR_NETWORK") {
          return {
            data: null,
            error: new Error(
              `Cannot connect to the Django backend at ${new URL(API_URL).origin}. Start it with: npm run dev:backend`,
            ),
          };
        }

        return {
          data: null,
          error: new Error(
            apiErrorMessage(axiosError.response?.data, axiosError.message),
          ),
        };
      }
    },
    async exchangeOAuthCode({
      provider,
      code,
      state,
      redirectTo,
    }: {
      provider: OAuthProvider;
      code: string;
      state: string;
      redirectTo: string;
    }) {
      try {
        const endpoint =
          provider === "google"
            ? "accounts/auth/o/google-oauth2"
            : "accounts/auth/o/github";

        const url = new URL(`${API_URL}/${endpoint}/`);

        url.searchParams.set("redirect_uri", redirectTo);

        const body = new URLSearchParams({
          code,
          state,
        });

        const response = await axios.post<{
          access: string;
          refresh: string;
        }>(url.toString(), body.toString(), {
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        const { access, refresh } = response.data;

        if (!access || !refresh) {
          throw new Error("Django did not return JWT tokens");
        }

        localStorage.setItem(TOKEN_KEY, access);
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh);

        const user = await fetchJson(`${API_URL}/${API_ENDPOINTS.auth.me}/`);

        currentSession = {
          user: toAuthUser(user),
          access_token: access,
          refresh_token: refresh,
        };

        listeners.forEach((listener) => {
          listener("SIGNED_IN", currentSession);
        });

        return {
          data: {
            session: currentSession,
            user: currentSession.user,
          },
          error: null,
        };
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);

        const axiosError = error as AxiosError<any>;

        return {
          data: null,
          error: new Error(
            apiErrorMessage(
              axiosError.response?.data,
              axiosError.message || "OAuth authentication failed",
            ),
          ),
        };
      }
    },
    async signOut() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      currentSession = null;
      listeners.forEach((listener) => listener("SIGNED_OUT", null));
      return { error: null };
    },
  },
  channel: () => ({
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
  }),
  removeChannel: async () => undefined,
  storage: {
    from: () => ({
      async remove() {
        return { data: null, error: null };
      },
      async upload() {
        return {
          data: null,
          error: new Error("File uploads require Django media configuration"),
        };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: path } };
      },
    }),
  },
};
