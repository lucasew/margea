# Guidelines
- Quando for chamar um comando confira se ele já não existe no mise.toml
- Usar apenas Tailwind e componentes DaisyUI para estilização. Prefira usar DaisyUI diretamente.
- Se a tarefa é relacionada a layout ou estilização só faça com auxílio do MCP do playwright
- Você não diz que tá bonito, responsivo, funcional, você me prova que está de forma que eu não consiga contestar.
- Prefira usar selenium para tirar screenshots, dá menos problema

- Se algo estiver faltando ou não for possível peça instruções adicionais

# Subindo dev server
- Gemini não consegue botar processos em background
  - Systemd: systemd-run -d --user --unit=dev-margea mise dev
