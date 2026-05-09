import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(frontendRoot, "android");

const run = (cmd, cwd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
};

const requiredEnv = [
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

const missing = requiredEnv.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}\n` +
      "Set these vars, then run this script again.",
  );
  process.exit(1);
}

const keystoreFileName = process.env.ANDROID_KEYSTORE_FILE || "release-keystore.jks";
const keystorePath = path.join(androidRoot, keystoreFileName);
const keystorePropsPath = path.join(androidRoot, "keystore.properties");
const dname = process.env.ANDROID_KEY_DNAME || "CN=Android Release, OU=Engineering, O=MyWebsite, L=Bengaluru, S=Karnataka, C=IN";

if (!fs.existsSync(keystorePath)) {
  console.log(`Keystore not found at ${keystorePath}. Generating a new one...`);
  run(
    [
      "keytool -genkeypair",
      "-v",
      "-keystore",
      `\"${keystorePath}\"`,
      "-storetype JKS",
      "-keyalg RSA",
      "-keysize 2048",
      "-validity 10000",
      `-alias \"${process.env.ANDROID_KEY_ALIAS}\"`,
      `-storepass \"${process.env.ANDROID_KEYSTORE_PASSWORD}\"`,
      `-keypass \"${process.env.ANDROID_KEY_PASSWORD}\"`,
      `-dname \"${dname}\"`,
    ].join(" "),
    androidRoot,
  );
}

const props = [
  `storeFile=${keystoreFileName}`,
  `storePassword=${process.env.ANDROID_KEYSTORE_PASSWORD}`,
  `keyAlias=${process.env.ANDROID_KEY_ALIAS}`,
  `keyPassword=${process.env.ANDROID_KEY_PASSWORD}`,
  "",
].join("\n");

fs.writeFileSync(keystorePropsPath, props, "utf8");
console.log(`Wrote ${keystorePropsPath}`);

run("npm run build", frontendRoot);
run("npx cap sync android", frontendRoot);
run("./gradlew bundleRelease", androidRoot);

const outputPath = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "bundle",
  "release",
  "app-release.aab",
);

if (!fs.existsSync(outputPath)) {
  console.error(`Signed AAB was not found at expected path: ${outputPath}`);
  process.exit(1);
}

console.log("\n✅ Signed Android App Bundle generated successfully:");
console.log(outputPath);
