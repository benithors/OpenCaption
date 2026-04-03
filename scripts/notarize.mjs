import path from 'node:path';
import {notarize} from '@electron/notarize';

export default async function notarizeApp(context) {
  const {electronPlatformName, appOutDir, packager} = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('[notarize] Skipping notarization: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not all set.');
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`[notarize] Notarizing ${appPath}`);
  await notarize({
    appBundleId: packager.appInfo.id,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
}
