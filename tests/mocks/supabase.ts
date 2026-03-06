type QueryResult = { data: any; error: any };

type QueueMap = Map<string, QueryResult[]>;

const fromQueues: QueueMap = new Map();
const storageQueues: QueueMap = new Map();
const functionQueues: QueueMap = new Map();

function normalize(result: Partial<QueryResult>): QueryResult {
  return {
    data: result.data ?? null,
    error: result.error ?? null,
  };
}

function enqueue(map: QueueMap, key: string, results: Array<Partial<QueryResult>>) {
  const existing = map.get(key) ?? [];
  map.set(key, [...existing, ...results.map(normalize)]);
}

function dequeue(map: QueueMap, key: string, fallback?: QueryResult): QueryResult {
  const queue = map.get(key);
  if (queue && queue.length > 0) {
    const next = queue.shift() as QueryResult;
    map.set(key, queue);
    return next;
  }

  return fallback ?? { data: null, error: null };
}

function pickFromResult(table: string, operation: string, mode?: "single" | "maybeSingle") {
  const keys = mode
    ? [`${table}.${operation}.${mode}`, `${table}.${operation}`]
    : [`${table}.${operation}`];

  for (const key of keys) {
    const queue = fromQueues.get(key);
    if (queue && queue.length > 0) {
      return dequeue(fromQueues, key);
    }
  }

  return { data: null, error: null };
}

function makeBuilder(table: string) {
  let operation = "select";

  const builder: any = {
    select: jest.fn(() => {
      if (operation === "select") {
        operation = "select";
      }
      return builder;
    }),
    insert: jest.fn(() => {
      operation = "insert";
      return builder;
    }),
    update: jest.fn(() => {
      operation = "update";
      return builder;
    }),
    upsert: jest.fn(() => {
      operation = "upsert";
      return builder;
    }),
    delete: jest.fn(() => {
      operation = "delete";
      return builder;
    }),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    in: jest.fn(() => builder),
    or: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    single: jest.fn(async () => pickFromResult(table, operation, "single")),
    maybeSingle: jest.fn(async () =>
      pickFromResult(table, operation, "maybeSingle"),
    ),
  };

  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(pickFromResult(table, operation)).then(
      onFulfilled,
      onRejected,
    );

  builder.catch = (onRejected: any) =>
    Promise.resolve(pickFromResult(table, operation)).catch(onRejected);

  builder.finally = (onFinally: any) =>
    Promise.resolve(pickFromResult(table, operation)).finally(onFinally);

  return builder;
}

const auth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  setSession: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
  onAuthStateChange: jest.fn(),
  signOut: jest.fn(),
};

const storage = {
  from: jest.fn((bucket: string) => ({
    createSignedUrl: jest.fn(async () =>
      dequeue(storageQueues, `${bucket}.createSignedUrl`, {
        data: { signedUrl: "https://signed.mock/url" },
        error: null,
      }),
    ),
    upload: jest.fn(async () =>
      dequeue(storageQueues, `${bucket}.upload`, {
        data: { path: "uploaded/path.jpg" },
        error: null,
      }),
    ),
    remove: jest.fn(async () =>
      dequeue(storageQueues, `${bucket}.remove`, {
        data: [],
        error: null,
      }),
    ),
    getPublicUrl: jest.fn((path: string) =>
      dequeue(storageQueues, `${bucket}.getPublicUrl`, {
        data: { publicUrl: `https://public.mock/${path}` },
        error: null,
      }),
    ),
  })),
};

const functions = {
  invoke: jest.fn(async (name: string) =>
    dequeue(functionQueues, name, { data: {}, error: null }),
  ),
};

export const supabaseMock = {
  from: jest.fn((table: string) => makeBuilder(table)),
  auth,
  storage,
  functions,
};

export function queueFrom(table: string, operation: string, ...results: Array<Partial<QueryResult>>) {
  enqueue(fromQueues, `${table}.${operation}`, results);
}

export function queueFromSingle(
  table: string,
  operation: string,
  ...results: Array<Partial<QueryResult>>
) {
  enqueue(fromQueues, `${table}.${operation}.single`, results);
}

export function queueFromMaybeSingle(
  table: string,
  operation: string,
  ...results: Array<Partial<QueryResult>>
) {
  enqueue(fromQueues, `${table}.${operation}.maybeSingle`, results);
}

export function queueStorage(
  bucket: string,
  method: "createSignedUrl" | "upload" | "remove" | "getPublicUrl",
  ...results: Array<Partial<QueryResult>>
) {
  enqueue(storageQueues, `${bucket}.${method}`, results);
}

export function queueFunction(name: string, ...results: Array<Partial<QueryResult>>) {
  enqueue(functionQueues, name, results);
}

export function resetSupabaseMock() {
  fromQueues.clear();
  storageQueues.clear();
  functionQueues.clear();

  supabaseMock.from.mockClear();
  supabaseMock.storage.from.mockClear();
  supabaseMock.functions.invoke.mockClear();

  auth.signInWithPassword.mockReset();
  auth.signUp.mockReset();
  auth.setSession.mockReset();
  auth.getSession.mockReset();
  auth.getUser.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.signOut.mockReset();

  auth.signInWithPassword.mockResolvedValue({ data: null, error: null });
  auth.signUp.mockResolvedValue({ data: null, error: null });
  auth.setSession.mockResolvedValue({ data: null, error: null });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });
  auth.signOut.mockResolvedValue({ error: null });
}
