export type FlagStatus = "on" | "off";
export type Environment = "dev" | "staging" | "prod";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  status: FlagStatus;
  rolloutPct: number;
  environment: Environment;
  lastChangedBy: string;
  lastChangedAt: string;
}

export function isFlagStatus(v: unknown): v is FlagStatus {
  return v === "on" || v === "off";
}

export function isEnvironment(v: unknown): v is Environment {
  return v === "dev" || v === "staging" || v === "prod";
}

export type Role = "Engineer" | "Ops" | "Compliance";

export function isRole(v: unknown): v is Role {
  return v === "Engineer" || v === "Ops" || v === "Compliance";
}

export type AuditAction = "create" | "update" | "delete";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  flagId: string;
  flagName: string;
  oldValue: FeatureFlag | null;
  newValue: FeatureFlag | null;
  actor: string;
  role: Role;
  timestamp: string;
}

interface StoreState {
  flags: FeatureFlag[];
  nextId: number;
  auditLog: AuditEntry[];
  nextAuditId: number;
}

const globalStore = globalThis as unknown as { __flagStore?: StoreState };

const genId = () => `flag-${state.nextId++}`;

const makeSeedFlag = (
  name: string,
  description: string,
  status: FlagStatus,
  rolloutPct: number,
  environment: Environment
): FeatureFlag => ({
  id: "",
  name,
  description,
  status,
  rolloutPct,
  environment,
  lastChangedBy: "system",
  lastChangedAt: new Date().toISOString(),
});

function seedState(): StoreState {
  const seeds = [
    makeSeedFlag(
      "instant-transfer-limits",
      "Per-user limits for instant transfers",
      "on",
      25,
      "prod"
    ),
    makeSeedFlag(
      "new-onboarding-flow",
      "Redesigned signup and KYC onboarding flow",
      "on",
      50,
      "staging"
    ),
    makeSeedFlag(
      "kyc-provider-fallback",
      "Fall back to secondary KYC provider on outage",
      "on",
      100,
      "prod"
    ),
    makeSeedFlag(
      "card-freeze",
      "Allow users to freeze and unfreeze cards",
      "on",
      100,
      "prod"
    ),
    makeSeedFlag(
      "weekend-payout-hold",
      "Hold payouts initiated over the weekend",
      "off",
      0,
      "prod"
    ),
    makeSeedFlag(
      "crypto-trading-beta",
      "Beta access to crypto trading features",
      "off",
      10,
      "dev"
    ),
    makeSeedFlag(
      "savings-pots",
      "Sub-account savings pots with goals",
      "on",
      40,
      "staging"
    ),
    makeSeedFlag(
      "step-up-auth-threshold",
      "Require step-up auth above transaction threshold",
      "on",
      100,
      "prod"
    ),
  ];
  seeds.forEach((f, i) => (f.id = `flag-${i + 1}`));
  return {
    flags: seeds,
    nextId: seeds.length + 1,
    auditLog: [],
    nextAuditId: 1,
  };
}

// Stored on globalThis so the in-memory data survives Next.js dev-mode
// module recompiles; still resets on server restart.
const state = (globalStore.__flagStore ??= seedState());
// Backfill audit fields on store state persisted from before audit support.
state.auditLog ??= [];
state.nextAuditId ??= 1;
const flags = state.flags;
const auditLog = state.auditLog;

function appendAudit(
  action: AuditAction,
  flagId: string,
  flagName: string,
  oldValue: FeatureFlag | null,
  newValue: FeatureFlag | null,
  actor: string,
  role: Role
): void {
  auditLog.push({
    id: `audit-${state.nextAuditId++}`,
    action,
    flagId,
    flagName,
    oldValue,
    newValue,
    actor,
    role,
    timestamp: new Date().toISOString(),
  });
}

export function listAuditLog(): AuditEntry[] {
  return auditLog.map((e) => ({
    ...e,
    oldValue: e.oldValue && { ...e.oldValue },
    newValue: e.newValue && { ...e.newValue },
  }));
}

export function listFlags(): FeatureFlag[] {
  return flags.map((f) => ({ ...f }));
}

export function getFlag(id: string): FeatureFlag | undefined {
  return flags.find((f) => f.id === id);
}

export interface CreateFlagInput {
  name: string;
  description: string;
  status: FlagStatus;
  rolloutPct: number;
  environment: Environment;
  changedBy: string;
  role: Role;
}

export function createFlag(input: CreateFlagInput): FeatureFlag {
  const flag: FeatureFlag = {
    id: genId(),
    name: input.name,
    description: input.description,
    status: input.status,
    rolloutPct: input.rolloutPct,
    environment: input.environment,
    lastChangedBy: input.changedBy,
    lastChangedAt: new Date().toISOString(),
  };
  flags.push(flag);
  // Mutation and audit entry happen in the same operation; no caller can
  // create a flag without producing an audit record.
  appendAudit(
    "create",
    flag.id,
    flag.name,
    null,
    { ...flag },
    input.changedBy,
    input.role
  );
  return flag;
}

export type UpdateFlagInput = Partial<
  Pick<
    FeatureFlag,
    "name" | "description" | "status" | "rolloutPct" | "environment"
  >
> & { changedBy: string; role: Role };

export function updateFlag(
  id: string,
  input: UpdateFlagInput
): FeatureFlag | undefined {
  const flag = getFlag(id);
  if (!flag) return undefined;
  const { changedBy, role, ...fields } = input;
  const oldValue = { ...flag };
  Object.assign(flag, fields);
  flag.lastChangedBy = changedBy;
  flag.lastChangedAt = new Date().toISOString();
  appendAudit("update", flag.id, flag.name, oldValue, { ...flag }, changedBy, role);
  return flag;
}

export function deleteFlag(id: string, actor: string, role: Role): boolean {
  const idx = flags.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  const [removed] = flags.splice(idx, 1);
  appendAudit("delete", removed.id, removed.name, { ...removed }, null, actor, role);
  return true;
}
