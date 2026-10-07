// node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify, process: process2 } = globalThis;
  return Netlify?.env ?? Deno?.env ?? {
    delete: (key) => delete process2?.env[key],
    get: (key) => process2?.env[key],
    has: (key) => Boolean(process2?.env[key]),
    set: (key, value) => {
      if (process2?.env) {
        process2.env[key] = value;
      }
    },
    toObject: () => process2?.env ?? {}
  };
};

// node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// node_modules/@netlify/blobs/dist/chunk-QDL6ESI2.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context, responseBody) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
    if (context.edgeAccess) {
      return summary;
    }
    return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  let message = `Netlify Blobs has generated an internal error (${details})`;
  if (!res.headers.get(NF_ERROR) && responseBody) {
    message += `: ${responseBody}`;
  }
  return message;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}, responseBody) {
    super(blobsErrorMessage(res, context, responseBody));
    this.name = "BlobsInternalError";
    this.status = res.status;
    this.responseBody = responseBody;
  }
};
var createBlobsInternalError = async (res, context = {}) => {
  const responseBody = await res.clone().text().catch(() => void 0);
  return new BlobsInternalError(res, context, responseBody);
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var REGION_AUTO = "auto";
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
  try {
    const res = await fetch(url, options);
    const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
    if (attemptsLeft > 0 && isRetryable) {
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      const retryUrl = getRetryUrl ? await getRetryUrl() : url;
      return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    const retryUrl = getRetryUrl ? await getRetryUrl() : url;
    return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  /**
   * Whether requests reach Blobs through the edge rather than the API. Only
   * runtime environments are given an edge URL.
   */
  get edgeAccess() {
    return this.edgeURL !== void 0;
  }
  constructor({ apiURL, consistency, edgeURL, fetch, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
    let getRetryUrl;
    if (usesSignedUrl) {
      getRetryUrl = async () => {
        const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
        return finalRequest.url;
      };
    }
    return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "delete",
        storeName: this.name
      });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        throw new BlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "delete",
          storeName: this.name
        });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getDeployStoreRegion = (clientOptions, context) => {
  if (clientOptions.region) {
    return clientOptions.region;
  }
  if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
    if (!context.primaryRegion) {
      throw new Error(
        "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
      );
    }
    return context.primaryRegion;
  }
  return REGION_AUTO;
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const context = getEnvironmentContext();
    const clientOptions = getClientOptions(input, context);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    clientOptions.region = getDeployStoreRegion(clientOptions, context);
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// src/api.mjs
import crypto from "node:crypto";
var config = { path: "/api/*" };
var st = () => getStore({ name: "petadopt", consistency: "strong" });
var T = (v, n = 300) => String(v == null ? "" : v).trim().slice(0, n);
var pick = (v, l, d) => l.includes(v) ? v : d;
var YN = ["Yes", "No", "Unknown"];
var uid = () => crypto.randomBytes(6).toString("hex");
var bad = (m, c = 400) => {
  throw { c, m };
};
var R = (o, c = 200) => new Response(JSON.stringify(o), { status: c, headers: { "content-type": "application/json" } });
var J = (s, k) => s.get(k, { type: "json" });
var LS = async (s, p) => {
  const r = await s.list({ prefix: p });
  return (await Promise.all(r.blobs.map((b) => J(s, b.key)))).filter(Boolean);
};
var uk = (e) => "u/" + encodeURIComponent(e);
var SECRET = process.env.JWT_SECRET || "";
var secret = async (s) => {
  if (SECRET) return SECRET;
  let x = await s.get("secret");
  if (!x) {
    x = crypto.randomBytes(32).toString("hex");
    await s.set("secret", x);
  }
  return SECRET = x;
};
var hash = (pw, salt = crypto.randomBytes(16).toString("hex")) => salt + ":" + crypto.scryptSync(pw, salt, 32).toString("hex");
var same = (pw, h) => {
  const [s, x] = h.split(":");
  const y = hash(pw, s).split(":")[1];
  return x.length == y.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(y));
};
var mkTok = async (s, email) => {
  const b = Buffer.from(JSON.stringify({ e: email, x: Date.now() + 30 * 864e5 })).toString("base64url");
  return b + "." + crypto.createHmac("sha256", await secret(s)).update(b).digest("base64url");
};
var ADMIN = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
var isAdmin = (u) => !!u.admin || ADMIN && u.email == ADMIN;
var usr = (u) => ({ name: u.name, city: u.city, email: u.email, admin: !!isAdmin(u) });
async function me(s, req) {
  try {
    const [b, g] = (req.headers.get("authorization") || "").slice(7).split(".");
    const ok = crypto.createHmac("sha256", await secret(s)).update(b).digest("base64url");
    if (g != ok) throw 0;
    const d = JSON.parse(Buffer.from(b, "base64url"));
    if (d.x < Date.now()) throw 0;
    const u = await J(s, uk(d.e));
    if (!u) throw 0;
    return u;
  } catch (e) {
    bad("Please login again", 401);
  }
}
var owns = (p, u) => p.owner == u.email;
var pub = (p) => {
  const { owner, contact, ...r } = p;
  return r;
};
var phoneOk = (v) => /^[0-9+\-\s]{8,15}$/.test(T(v));
var WILD = /\b(tiger|lion|leopard|elephant|monkey|langur|macaque|bear|deer|peacock|pangolin|owl|python|cobra|snake|tortoise|turtle|crocodile|parakeet|myna|wild)\b/i;
var hits = {};
var api_default = async (req) => {
  try {
    const s = st(), url = new URL(req.url), P = url.pathname.replace(/^\/api/, "").replace(/\/$/, ""), M = req.method;
    if (M == "GET" && P.startsWith("/img/")) {
      const f = P.slice(5).replace(/[^a-z0-9.]/g, "");
      const d2 = await s.get("img/" + f, { type: "arrayBuffer" });
      if (!d2) return R({ error: "Not found" }, 404);
      return new Response(d2, { headers: { "content-type": "image/" + (f.endsWith(".png") ? "png" : f.endsWith(".webp") ? "webp" : "jpeg"), "cache-control": "public,max-age=604800" } });
    }
    let d = {};
    if (M == "POST") {
      try {
        d = await req.json() || {};
      } catch (e) {
      }
    }
    const ip = req.headers.get("x-nf-client-connection-ip") || "x";
    if (M == "POST" && (P == "/login" || P == "/signup")) {
      const t = Date.now();
      hits[ip] = (hits[ip] || []).filter((x) => t - x < 6e5);
      if (hits[ip].length >= 20) bad("Too many tries. Please wait 10 minutes.", 429);
      hits[ip].push(t);
    }
    if (M == "POST" && P == "/signup") {
      const e = T(d.email, 100).toLowerCase(), n = T(d.name, 60), c = T(d.city, 60), p = String(d.password || "");
      if (!n || !c) bad("Please fill your name and city");
      if (!/^[^\s@]+@gmail\.com$/.test(e)) bad("Please use a Gmail address like name@gmail.com");
      if (p.length < 6 || p.length > 100) bad("Password must be at least 6 characters");
      if (await J(s, uk(e))) bad("This Gmail already has an account \u2013 please Login", 409);
      const first = (await s.list({ prefix: "u/" })).blobs.length == 0;
      const u2 = { name: n, city: c, email: e, hash: hash(p), admin: ADMIN ? e == ADMIN : first, created: Date.now() };
      await s.setJSON(uk(e), u2);
      return R({ token: await mkTok(s, e), user: usr(u2) });
    }
    if (M == "POST" && P == "/login") {
      const e = T(d.email, 100).toLowerCase(), u2 = await J(s, uk(e));
      if (!u2 || !same(String(d.password || ""), u2.hash)) bad("Wrong Gmail or password (new here? tap Sign Up)", 401);
      return R({ token: await mkTok(s, e), user: usr(u2) });
    }
    const u = await me(s, req);
    if (M == "GET" && P == "/me") return R({ user: usr(u) });
    if (M == "GET" && P == "/pets") {
      const l = await LS(s, "p/");
      return R({ pets: l.filter((p) => !p.adopted && (p.verified || owns(p, u))).sort((a, b) => b.created - a.created).map(pub) });
    }
    let m;
    if (M == "GET" && (m = /^\/pets\/([\w]+)$/.exec(P))) {
      const p = await J(s, "p/" + m[1]);
      if (!p) bad("Pet not found", 404);
      const mine = owns(p, u), adm = isAdmin(u);
      if (!p.verified && !mine && !adm) bad("Pet not found", 404);
      const a = await J(s, "a/" + p.id + "_" + encodeURIComponent(u.email)), r = { ...pub(p), mine };
      if (a) r.myApp = { status: a.status };
      if (mine || adm || a && a.status == "Accepted") r.contact = p.contact;
      return R({ pet: r });
    }
    if (M == "POST" && P == "/pets") {
      const age = Math.round(+d.ay * (d.au == "years" ? 12 : 1));
      const need = { name: "Pet name", breed: "Breed", city: "City", area: "Area/Pincode", desc: "Description", reason: "Reason for rehoming", lname: "Your name", phone: "Phone", email: "Email", from: "Available-from date" };
      for (const k in need) if (!T(d[k])) bad(need[k] + " is required");
      if (!(age >= 1 && age <= 360)) bad("Please enter a valid age");
      if (WILD.test(T(d.name) + " " + T(d.breed) + " " + T(d.type))) bad("Protected / wild animals cannot be listed on PetAdopt");
      if (!phoneOk(d.phone)) bad("Please enter a valid phone number");
      const files = [];
      for (const x of (Array.isArray(d.photos) ? d.photos : []).slice(0, 5)) {
        const g = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(x || "");
        if (!g) continue;
        const b = Buffer.from(g[2], "base64");
        if (b.length > 15e5) continue;
        const f = uid() + "." + (g[1] == "jpeg" ? "jpg" : g[1]);
        await s.set("img/" + f, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
        files.push("/api/img/" + f);
      }
      if (!files.length) bad("Please add at least 1 clear photo of the pet");
      const p = {
        id: "u" + uid(),
        owner: u.email,
        verified: false,
        created: Date.now(),
        photos: files,
        name: T(d.name, 40),
        type: pick(d.type, ["Dog", "Cat", "Rabbit", "Bird", "Other"], "Other"),
        breed: T(d.breed, 60),
        age,
        gender: pick(d.gender, ["Male", "Female"], "Male"),
        size: pick(d.size, ["Small", "Medium", "Large"], "Medium"),
        weight: T(d.weight, 20),
        video: T(d.video, 200),
        vacc: pick(d.vacc, ["Vaccinated", "Partially vaccinated", "Not vaccinated", "Unknown"], "Unknown"),
        vaccDetail: T(d.vaccDetail, 200),
        deworm: pick(d.deworm, YN, "Unknown"),
        sterile: pick(d.sterile, YN, "Unknown"),
        health: T(d.hsel, 100),
        medical: T(d.medical, 200) || "Unknown",
        meds: T(d.meds, 200) || "None",
        vet: T(d.vet, 100),
        energy: pick(d.energy, ["Calm", "Friendly", "Playful", "Energetic", "Shy", "Protective"], "Friendly"),
        kids: pick(d.kids, YN, "Unknown"),
        dogs: pick(d.dogs, YN, "Unknown"),
        cats: pick(d.cats, YN, "Unknown"),
        house: pick(d.house, YN, "Unknown"),
        leash: pick(d.leash, YN, "Unknown"),
        strangers: pick(d.strangers, YN, "Unknown"),
        special: T(d.special, 200),
        fav: T(d.fav, 200),
        desc: T(d.desc, 1500),
        reason: T(d.reason, 500),
        city: T(d.city, 60),
        area: T(d.area, 80),
        from: T(d.from, 20),
        fee: pick(d.fee, ["Free", "Fee", "Contact for details"], "Free"),
        feeAmt: T(d.feeAmt, 60),
        relation: pick(d.relation, ["Owner", "Rescuer", "Shelter", "Volunteer"], "Owner"),
        contact: { name: T(d.lname, 60), phone: T(d.phone, 20), email: T(d.email, 100), cm: pick(d.cm, ["Phone", "WhatsApp", "Email"], "Phone") }
      };
      await s.setJSON("p/" + p.id, p);
      return R({ pet: pub(p) });
    }
    if (M == "POST" && (m = /^\/pets\/(\w+)\/adopted$/.exec(P))) {
      const p = await J(s, "p/" + m[1]);
      if (!p || !owns(p, u)) bad("Not allowed", 403);
      p.adopted = true;
      await s.setJSON("p/" + p.id, p);
      return R({ ok: 1 });
    }
    if (M == "POST" && P == "/apply") {
      const p = await J(s, "p/" + T(d.petId, 30).replace(/\W/g, ""));
      if (!p || !p.verified || p.adopted) bad("This pet is not available", 404);
      if (owns(p, u)) bad("You cannot adopt your own listing");
      const k = "a/" + p.id + "_" + encodeURIComponent(u.email);
      if (await J(s, k)) bad("You already sent a request for this pet", 409);
      if (!phoneOk(d.phone)) bad("Please enter a valid phone number");
      if (!T(d.name) || !T(d.why) || !T(d.city)) bad("Please fill all fields");
      await s.setJSON(k, { id: uid(), key: k, petId: p.id, by: u.email, status: "Pending verification", created: Date.now(), name: T(d.name, 60), phone: T(d.phone, 20), email: T(d.email, 100), city: T(d.city, 60), home: T(d.home, 60), exp: T(d.exp, 60), exist: T(d.exist, 40), kids: T(d.kids, 10), why: T(d.why, 800) });
      return R({ ok: 1 });
    }
    if (M == "GET" && P == "/my") {
      const pets = await LS(s, "p/"), apps = await LS(s, "a/"), ids = pets.filter((p) => owns(p, u)).map((p) => p.id), nm = (a) => (pets.find((p) => p.id == a.petId) || {}).name || "Pet";
      return R({
        listings: pets.filter((p) => owns(p, u) && !p.adopted).map(pub),
        incoming: apps.filter((a) => ids.includes(a.petId) && ["Verified", "Accepted"].includes(a.status)).map((a) => ({ ...a, key: void 0, by: void 0, petName: nm(a), adopted: !!(pets.find((p) => p.id == a.petId) || {}).adopted, phone: a.status == "Accepted" ? a.phone : "", email: a.status == "Accepted" ? a.email : "" })),
        mine: apps.filter((a) => a.by == u.email).map((a) => ({ id: a.id, petId: a.petId, petName: nm(a), status: a.status }))
      });
    }
    if (M == "POST" && (m = /^\/apps\/(\w+)\/decision$/.exec(P))) {
      const a = (await LS(s, "a/")).find((x) => x.id == m[1]), p = a && await J(s, "p/" + a.petId);
      if (!a || !p || !owns(p, u)) bad("Not allowed", 403);
      if (a.status != "Verified") bad("Request is not verified yet");
      a.status = d.accept ? "Accepted" : "Declined";
      await s.setJSON(a.key, a);
      return R({ ok: 1 });
    }
    if (P.startsWith("/admin")) {
      if (!isAdmin(u)) bad("Admin only", 403);
      if (M == "GET" && P == "/admin") {
        const pets = await LS(s, "p/"), apps = await LS(s, "a/");
        return R({ listings: pets.filter((p) => !p.verified).map((p) => ({ ...pub(p), contact: p.contact, owner: p.owner })), apps: apps.filter((a) => a.status == "Pending verification").map((a) => ({ ...a, petName: (pets.find((p) => p.id == a.petId) || {}).name || "Pet" })) });
      }
      if (M == "POST" && P == "/admin/listing") {
        const p = await J(s, "p/" + T(d.id, 30).replace(/\W/g, ""));
        if (!p) bad("Not found", 404);
        if (d.ok) {
          p.verified = true;
          await s.setJSON("p/" + p.id, p);
        } else {
          await s.delete("p/" + p.id);
          for (const f of p.photos || []) await s.delete("img/" + f.split("/").pop());
        }
        return R({ ok: 1 });
      }
      if (M == "POST" && P == "/admin/app") {
        const a = (await LS(s, "a/")).find((x) => x.id == d.id);
        if (!a) bad("Not found", 404);
        a.status = d.ok ? "Verified" : "Rejected";
        await s.setJSON(a.key, a);
        return R({ ok: 1 });
      }
    }
    return R({ error: "Not found" }, 404);
  } catch (e) {
    if (e && e.c) return R({ error: e.m }, e.c);
    console.error(e);
    return R({ error: "Server error" }, 500);
  }
};
export {
  config,
  api_default as default
};
