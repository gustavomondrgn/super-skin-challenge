import type { BrowserContext, Route, WebSocketRoute } from "@playwright/test";
import { createInitialState, type TournamentState } from "../src/domain";

export const MOCK_SUPABASE_URL = "https://ssc-e2e.supabase.co";
export const MOCK_SUPABASE_KEY = "sb_publishable_ssc_e2e_isolated_fake_key";
export const MOCK_ADMIN_EMAIL = "admin@ssc.test";
export const MOCK_VIEWER_EMAIL = "viewer@ssc.test";
export const MOCK_PASSWORD = "Test-Event-2026!";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const VIEWER_ID = "22222222-2222-4222-8222-222222222222";
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range, x-supabase-api-version",
};

type Row = {
  id: "main";
  data: TournamentState;
  version: number;
  updated_at: string;
};
type Json = Record<string, unknown>;
type PhoenixMessage = {
  join_ref?: string | null;
  ref?: string | null;
  topic: string;
  event: string;
  payload: Json;
};
type Subscription = {
  joinRef: string | null;
  bindings: Array<Json & { id: number }>;
};
type Socket = {
  route: WebSocketRoute;
  arrayProtocol: boolean;
  topics: Map<string, Subscription>;
};

const clone = <T>(value: T): T => structuredClone(value);

function userFor(id: string) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: id === ADMIN_ID ? MOCK_ADMIN_EMAIL : MOCK_VIEWER_EMAIL,
    email_confirmed_at: "2026-10-18T12:00:00.000Z",
    confirmed_at: "2026-10-18T12:00:00.000Z",
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: "2026-10-18T12:00:00.000Z",
    updated_at: "2026-10-18T12:00:00.000Z",
    is_anonymous: false,
  };
}

function sessionFor(id: string) {
  const now = Math.floor(Date.now() / 1000);
  const base64url = (value: string) =>
    btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const encode = (value: unknown) => base64url(JSON.stringify(value));
  const token = [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      exp: now + 3600,
      iat: now,
      iss: `${MOCK_SUPABASE_URL}/auth/v1`,
    }),
    base64url("isolated-e2e-signature"),
  ].join(".");
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `ssc-e2e-refresh-${id}`,
    user: userFor(id),
  };
}

function bearerSubject(route: Route): string | null {
  const auth = route.request().headers().authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const payload = JSON.parse(
      atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
    );
    if (payload.exp <= Date.now() / 1000) return null;
    return payload.sub === ADMIN_ID || payload.sub === VIEWER_ID
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

/** In-memory Supabase transport. It never connects to a Supabase server. */
export class MockSupabase {
  row: Row | null;
  writes = 0;
  failNextWrite = false;
  conflictNextWrite = false;
  dropRealtime = false;
  readonly faults: string[] = [];
  private readonly contexts = new WeakSet<BrowserContext>();
  private readonly sockets = new Set<Socket>();

  constructor(initial?: TournamentState) {
    this.row = initial
      ? {
          id: "main",
          data: clone(initial),
          version: 1,
          updated_at: new Date().toISOString(),
        }
      : null;
  }

  getState(): TournamentState {
    return clone(this.row?.data ?? createInitialState());
  }

  setState(state: TournamentState): void {
    const oldRow = this.row;
    this.row = {
      id: "main",
      data: clone(state),
      version: (oldRow?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };
    this.publish(oldRow ? "UPDATE" : "INSERT", oldRow);
  }

  disconnect(): void {
    for (const socket of this.sockets) {
      try {
        void socket.route
          .close({ code: 1012, reason: "Isolated test reconnection" })
          .catch(() => {});
      } catch {
        // A browser context may have already closed its socket.
      }
    }
    this.sockets.clear();
  }

  async install(context: BrowserContext): Promise<void> {
    if (this.contexts.has(context)) return;
    this.contexts.add(context);
    await context.route(`${MOCK_SUPABASE_URL}/**`, (route) =>
      this.handleRequest(route),
    );
    await context.routeWebSocket(/ssc-e2e\.supabase\.co.*realtime/, (route) => {
      const socket: Socket = { route, arrayProtocol: true, topics: new Map() };
      this.sockets.add(socket);
      route.onClose(() => this.sockets.delete(socket));
      route.onMessage((raw) => this.handleSocket(socket, raw));
    });
  }

  private async reply(
    route: Route,
    body: unknown,
    status = 200,
  ): Promise<void> {
    await route.fulfill({
      status,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  }

  private async rows(route: Route, rows: unknown[]): Promise<void> {
    const singular = route
      .request()
      .headers()
      .accept?.includes("application/vnd.pgrst.object+json");
    await this.reply(route, singular ? (rows[0] ?? null) : rows);
  }

  private async fail(
    route: Route,
    status: number,
    code: string,
    message: string,
  ): Promise<void> {
    await this.reply(
      route,
      { code, message, details: null, hint: null },
      status,
    );
  }

  private async handleRequest(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const subject = bearerSubject(route);
    if (url.pathname === "/auth/v1/token" && method === "POST") {
      const body = request.postDataJSON() as Json;
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const id =
          body.refresh_token === `ssc-e2e-refresh-${ADMIN_ID}`
            ? ADMIN_ID
            : body.refresh_token === `ssc-e2e-refresh-${VIEWER_ID}`
              ? VIEWER_ID
              : null;
        if (id) await this.reply(route, sessionFor(id));
        else
          await this.reply(
            route,
            { code: "refresh_token_not_found", msg: "Invalid refresh token" },
            400,
          );
        return;
      }
      const id =
        body.email === MOCK_ADMIN_EMAIL
          ? ADMIN_ID
          : body.email === MOCK_VIEWER_EMAIL
            ? VIEWER_ID
            : null;
      if (body.password !== MOCK_PASSWORD || !id) {
        await this.reply(
          route,
          { code: "invalid_credentials", msg: "Invalid login credentials" },
          400,
        );
        return;
      }
      await this.reply(route, sessionFor(id));
      return;
    }
    if (url.pathname === "/auth/v1/user" && method === "GET") {
      if (subject) await this.reply(route, userFor(subject));
      else
        await this.reply(route, { code: "bad_jwt", msg: "Invalid JWT" }, 401);
      return;
    }
    if (url.pathname === "/auth/v1/logout" && method === "POST") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (url.pathname === "/rest/v1/event_admins" && method === "GET") {
      if (!subject) {
        await this.fail(
          route,
          401,
          "42501",
          "permission denied for table event_admins",
        );
        return;
      }
      const wanted = url.searchParams.get("user_id");
      await this.rows(
        route,
        subject === ADMIN_ID && (!wanted || wanted === `eq.${ADMIN_ID}`)
          ? [{ user_id: ADMIN_ID }]
          : [],
      );
      return;
    }
    if (url.pathname === "/rest/v1/tournament_state") {
      if (method === "GET") {
        const wantedId = url.searchParams.get("id");
        await this.rows(
          route,
          this.row && (!wantedId || wantedId === "eq.main")
            ? [clone(this.row)]
            : [],
        );
        return;
      }
      if (method === "POST" || method === "PATCH") {
        if (subject !== ADMIN_ID) {
          if (method === "PATCH" && subject) await this.rows(route, []);
          else
            await this.fail(
              route,
              subject ? 403 : 401,
              "42501",
              "new row violates row-level security policy for table tournament_state",
            );
          return;
        }
        if (this.failNextWrite) {
          this.failNextWrite = false;
          await this.fail(
            route,
            503,
            "SSC_TEST_OUTAGE",
            "Simulated temporary write outage",
          );
          return;
        }
        if (this.conflictNextWrite) {
          this.conflictNextWrite = false;
          this.setState(this.getState());
          await this.rows(route, []);
          return;
        }
        const body = request.postDataJSON() as Json;
        if (
          !body.data ||
          typeof body.data !== "object" ||
          Array.isArray(body.data) ||
          (body.data as Json).schemaVersion !== 1 ||
          new TextEncoder().encode(JSON.stringify(body.data)).byteLength >
            1_048_576
        ) {
          await this.fail(
            route,
            400,
            "23514",
            "tournament_state constraint violation",
          );
          return;
        }
        if (method === "POST" && this.row) {
          await this.fail(
            route,
            409,
            "23505",
            "duplicate key value violates unique constraint tournament_state_pkey",
          );
          return;
        }
        if (method === "POST" && body.id !== undefined && body.id !== "main") {
          await this.fail(
            route,
            403,
            "42501",
            "new row violates row-level security policy",
          );
          return;
        }
        if (method === "PATCH") {
          const wantedVersion = url.searchParams.get("version");
          if (
            !this.row ||
            url.searchParams.get("id") !== "eq.main" ||
            (wantedVersion && wantedVersion !== `eq.${this.row.version}`)
          ) {
            await this.rows(route, []);
            return;
          }
          if (body.version !== this.row.version + 1) {
            await this.fail(
              route,
              409,
              "40001",
              "A versão do evento mudou. Atualize os dados antes de salvar.",
            );
            return;
          }
        }
        this.setState(body.data as TournamentState);
        this.writes += 1;
        await this.rows(route, [clone(this.row)]);
        return;
      }
      if (method === "DELETE") {
        await this.fail(
          route,
          subject ? 403 : 401,
          "42501",
          "permission denied for table tournament_state",
        );
        return;
      }
    }
    const fault = `Unexpected mock endpoint: ${method} ${url.pathname}${url.search}`;
    this.faults.push(fault);
    await this.fail(route, 501, "SSC_UNEXPECTED_ENDPOINT", fault);
  }

  private send(socket: Socket, message: PhoenixMessage): void {
    try {
      socket.route.send(
        JSON.stringify(
          socket.arrayProtocol
            ? [
                message.join_ref ?? null,
                message.ref ?? null,
                message.topic,
                message.event,
                message.payload,
              ]
            : message,
        ),
      );
    } catch {
      this.sockets.delete(socket);
    }
  }

  private handleSocket(
    socket: Socket,
    raw: string | { toString(): string },
  ): void {
    let message: PhoenixMessage;
    try {
      const parsed = JSON.parse(raw.toString());
      socket.arrayProtocol = Array.isArray(parsed);
      message = socket.arrayProtocol
        ? {
            join_ref: parsed[0],
            ref: parsed[1],
            topic: parsed[2],
            event: parsed[3],
            payload: parsed[4],
          }
        : parsed;
    } catch {
      this.faults.push("Unexpected non-JSON Realtime message");
      return;
    }
    const response = (payload: Json = {}) =>
      this.send(socket, {
        join_ref: message.join_ref ?? null,
        ref: message.ref ?? null,
        topic: message.topic,
        event: "phx_reply",
        payload: { status: "ok", response: payload },
      });
    if (message.event === "phx_join") {
      const config = message.payload.config as Json | undefined;
      const filters = (config?.postgres_changes ?? []) as Json[];
      const bindings = filters.map((filter, index) => ({
        ...filter,
        id: index + 1,
      }));
      socket.topics.set(message.topic, {
        joinRef: message.join_ref ?? message.ref ?? null,
        bindings,
      });
      response({ postgres_changes: bindings });
      this.send(socket, {
        join_ref: message.join_ref ?? null,
        ref: null,
        topic: message.topic,
        event: "system",
        payload: {
          extension: "postgres_changes",
          status: "ok",
          message: "Subscribed to PostgreSQL",
          channel: message.topic,
        },
      });
    } else if (message.event === "phx_leave") {
      response();
      socket.topics.delete(message.topic);
    } else if (
      message.event === "heartbeat" ||
      message.event === "access_token"
    ) {
      response();
    } else {
      this.faults.push(`Unexpected Realtime event: ${message.event}`);
      response();
    }
  }

  private publish(type: "INSERT" | "UPDATE", oldRow: Row | null): void {
    if (this.dropRealtime || !this.row) return;
    const row = clone(this.row);
    for (const socket of this.sockets) {
      for (const [topic, subscription] of socket.topics) {
        const ids = subscription.bindings
          .filter(
            (binding) =>
              (binding.event === "*" || binding.event === type) &&
              binding.schema === "public" &&
              binding.table === "tournament_state",
          )
          .map((binding) => binding.id);
        if (!ids.length) continue;
        this.send(socket, {
          join_ref: subscription.joinRef,
          ref: null,
          topic,
          event: "postgres_changes",
          payload: {
            ids,
            data: {
              schema: "public",
              table: "tournament_state",
              commit_timestamp: row.updated_at,
              type,
              errors: null,
              columns: [
                { name: "id", type: "text" },
                { name: "data", type: "jsonb" },
                { name: "version", type: "int8" },
                { name: "updated_at", type: "timestamptz" },
              ],
              record: row,
              old_record: oldRow ? { id: oldRow.id } : {},
            },
          },
        });
      }
    }
  }
}
