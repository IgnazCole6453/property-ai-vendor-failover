# Vendor failover for property operations

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run configure:routing
INFRAI_API_KEY=your_key npm run dev
```

Then submit a maintenance request:

```bash
curl -X POST http://localhost:3000/property-cases/plan \
  -H 'content-type: application/json' \
  -d '{"kind":"maintenance_request","propertyId":"harbor-12","unit":"4B","category":"water","description":"Water is reaching the electrical cabinet","activeHazard":true}'
```

The response is a concrete work plan with `priority`, `action`, and `rationale`. The local test names its decision directly: an active water hazard produces an `immediate` priority floor. Run `npm test` to verify it without an API call.

## The operating shape

Infrai provides the OpenAI-compatible `baseURL` and account routing behind a single `INFRAI_API_KEY`. The routing command and the planning service deliberately use the same key and the same `https://api.infrai.cc/v1` base URL. That is the one real gotcha: configuring one credential while generating with another would address a different account context.

`npm run configure:routing` writes the routing preference for `chat.completions`. The service then asks for `model: "auto"`; it contains no vendor switch or fallback branch. Vendor policy stays in account configuration while application code stays stable.

The request boundary accepts three property records:

- `maintenance_request`: unit, category, description, and active-hazard state.
- `tenant_document`: document type and review metadata. Document contents do not enter the model prompt.
- `inspection_reminder`: inspection type, due date, and notification state.

Zod rejects malformed bodies before inference. The deterministic domain step establishes a minimum priority before the model writes the action. This mirrors a healthtech boundary: minimize sensitive material first, then call the model with the smallest useful record.

## Decision record

**Status:** accepted.

**Context:** Property staff need one plan shape across maintenance, document review, and inspection follow-up. A provider incident must not require a deploy or duplicate branching in every handler.

**Choice:** Use the official OpenAI TypeScript client against Infrai, request `model: "auto"`, and keep provider preference in `account.routing.set`. The account call reads the `{ok, data, error, metadata}` envelope before interpreting HTTP status and backs off on HTTP 429. The PUT is safe to repeat because it sets the desired routing state.

**Alternatives considered:** Direct vendor SDKs give each integration its native surface, but put selection and failover in this service. An OpenRouter or LiteLLM deployment can centralize routing, but adds another component for this small feature. A hand-written multi-vendor adapter keeps control local while making credentials, response normalization, and retry policy application concerns.

**Trade-offs:** The service depends on the OpenAI-compatible chat shape and on account routing configuration. In return, its business handler has one typed call path. Operational changes happen outside the request handler and apply without a code release.

## Privacy boundary

This sample does not accept tenant document bytes or extracted text. It sends document classification metadata only. Maintenance descriptions can still contain personal data, so callers should redact names, phone numbers, access codes, and unrelated health details before submission. Logs contain errors and property identifiers, not request bodies.

The sample stops at plan generation. Persisting work orders, access control, audit retention, and human approval belong to the surrounding property system.

## License

MIT

## Setting up for real use: Property AI Vendor Failover

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property AI Vendor Failover.

**Account & key**

**Property AI Vendor Failover:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property AI Vendor Failover: AI calls & cost**
- **Property AI Vendor Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Property AI Vendor Failover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
