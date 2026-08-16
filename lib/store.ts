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

interface StoreState {
  flags: FeatureFlag[];
  nextId: number;
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
  return { flags: seeds, nextId: seeds.length + 1 };
}

// Stored on globalThis so the in-memory data survives Next.js dev-mode
// module recompiles; still resets on server restart.
const state = (globalStore.__flagStore ??= seedState());
const flags = state.flags;

export function listFlags(): FeatureFlag[] {
  return flags;
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
  return flag;
}

export type UpdateFlagInput = Partial<
  Pick<
    FeatureFlag,
    "name" | "description" | "status" | "rolloutPct" | "environment"
  >
> & { changedBy: string };

export function updateFlag(
  id: string,
  input: UpdateFlagInput
): FeatureFlag | undefined {
  const flag = getFlag(id);
  if (!flag) return undefined;
  const { changedBy, ...fields } = input;
  Object.assign(flag, fields);
  flag.lastChangedBy = changedBy;
  flag.lastChangedAt = new Date().toISOString();
  return flag;
}

export function deleteFlag(id: string): boolean {
  const idx = flags.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  flags.splice(idx, 1);
  return true;
}
