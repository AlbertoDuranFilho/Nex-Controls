import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Transições de Server Action podem travar no React do Next 15.5; os wrappers destravam.
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/react/destravar-transicao.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useActionState", "useTransition"],
              message: "Use useAcao / useTransicao de @/lib/react/destravar-transicao.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
