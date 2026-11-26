import { fireEvent, render, screen } from "@testing-library/react-native";
import { CampoSenha } from "../CampoSenha";

describe("CampoSenha", () => {
  it("começa oculta e alterna rótulo e visibilidade ao tocar no olho", async () => {
    await render(<CampoSenha value="segredo" onChangeText={() => {}} testID="senha" />);

    const campo = screen.getByTestId("senha");
    expect(campo.props.secureTextEntry).toBe(true);
    const botao = screen.getByRole("button", { name: "Mostrar senha" });

    await fireEvent.press(botao);
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mostrar senha" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(screen.getByTestId("senha").props.secureTextEntry).toBe(true);
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeTruthy();
  });

  it("usa o rótulo Senha por padrão e repassa o texto digitado", async () => {
    const aoMudar = jest.fn();
    await render(<CampoSenha value="" onChangeText={aoMudar} testID="senha" />);
    expect(screen.getByText("Senha")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("senha"), "abc123");
    expect(aoMudar).toHaveBeenCalledWith("abc123");
  });
});
