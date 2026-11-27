import { render, screen } from "@testing-library/react-native";
import * as SplashScreen from "expo-splash-screen";
import RootLayout from "@/app/_layout";

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => {
  function Stack() {
    return null;
  }
  Stack.Screen = function Screen() {
    return null;
  };
  return { Stack, useRouter: () => ({ push: jest.fn() }) };
});
// build sem as variáveis do Supabase
jest.mock("@/lib/supabase", () => ({ CONFIGURACAO_AUSENTE: true, SITE_URL: "https://site.test", supabase: {} }));

it("sem as variáveis do Supabase mostra a tela de configuração ausente e tira a splash", async () => {
  await render(<RootLayout />);
  expect(await screen.findByTestId("configuracao-ausente")).toBeTruthy();
  expect(screen.getByText("App sem configuração")).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});
