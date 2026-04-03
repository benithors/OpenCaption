import {spawnSync} from 'node:child_process';

const strict = process.argv.includes('--strict');

const check = (label, command, args) => {
  const result = spawnSync(command, args, {encoding: 'utf8'});
  return {
    label,
    ok: result.status === 0,
    output: (result.stdout || result.stderr || '').trim(),
  };
};

const checks = [
  check('ffmpeg', 'ffmpeg', ['-version']),
  check('ffprobe', 'ffprobe', ['-version']),
  check('codesigning identities', 'security', ['find-identity', '-v', '-p', 'codesigning']),
];

const envState = {
  APPLE_ID: Boolean(process.env.APPLE_ID),
  APPLE_APP_SPECIFIC_PASSWORD: Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD),
  APPLE_TEAM_ID: Boolean(process.env.APPLE_TEAM_ID),
};

const codesigningIdentitySummary = checks
  .find((checkResult) => checkResult.label === 'codesigning identities')
  ?.output.split('\n')
  .filter(Boolean)
  .filter((line) => line.includes('"'))
  .map((line) => line.trim()) ?? [];

const readinessSummary = {
  hasDeveloperIdApplicationIdentity: codesigningIdentitySummary.some((line) => line.includes('Developer ID Application')),
  hasNotarizationEnv: envState.APPLE_ID && envState.APPLE_APP_SPECIFIC_PASSWORD && envState.APPLE_TEAM_ID,
};

const basePrereqsOk = checks.every((checkResult) => checkResult.ok);
const strictReleaseReady = basePrereqsOk && readinessSummary.hasDeveloperIdApplicationIdentity && readinessSummary.hasNotarizationEnv;

console.log(
  JSON.stringify(
    {
      checks,
      envState,
      codesigningIdentitySummary,
      readinessSummary,
      status: {
        strict,
        basePrereqsOk,
        strictReleaseReady,
      },
    },
    null,
    2,
  ),
);

process.exit(strict ? (strictReleaseReady ? 0 : 1) : basePrereqsOk ? 0 : 1);
