/*
  CONFIGURAÇÃO DO SITE DO CCI
  Este é o único arquivo que precisa ser mexido quando algo "de base" mudar.
  A programação, os passeios, as notícias e os avisos NÃO ficam aqui:
  eles vêm da planilha do Google que a coordenação atualiza.
*/
window.CCI_CONFIG = {
  // Telefone do CCI. Só números, com DDD. (Do cartão do CCI.)
  telefone: "1236624766",

  // Endereço usado no botão "Abrir no mapa".
  endereco: "Av. Frei Orestes Girardi, 105, Abernéssia, Campos do Jordão - SP",

  /*
    Links da planilha publicada ("Arquivo > Compartilhar > Publicar na web",
    uma aba por vez, formato "Valores separados por vírgula (.csv)").
    Enquanto estiverem vazios, o site usa os EXEMPLOS da pasta "dados".
  */
  planilha: {
    programacao: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpp88NiN5zVfzkbiCACUIk3Am60HUDIcOfHbcgJdkDzTbW4Q-1Q8phzDaick4jMFjPBj3VF0O0NvKp/pub?single=true&output=csv&gid=1332871150",
    eventos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpp88NiN5zVfzkbiCACUIk3Am60HUDIcOfHbcgJdkDzTbW4Q-1Q8phzDaick4jMFjPBj3VF0O0NvKp/pub?single=true&output=csv&gid=449385045",
    noticias: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpp88NiN5zVfzkbiCACUIk3Am60HUDIcOfHbcgJdkDzTbW4Q-1Q8phzDaick4jMFjPBj3VF0O0NvKp/pub?single=true&output=csv&gid=1079145520",
    avisos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpp88NiN5zVfzkbiCACUIk3Am60HUDIcOfHbcgJdkDzTbW4Q-1Q8phzDaick4jMFjPBj3VF0O0NvKp/pub?single=true&output=csv&gid=688705094"
  },

  /*
    MODO INFORMATIVO (período eleitoral).
    Em ano de eleição, nos 3 meses antes do pleito, a publicidade institucional
    é proibida (Lei 9.504/1997, art. 73, VI, "b"). Mude para true nesse período:
    o site esconde notícias e fotos e fica só com informações de serviço
    (endereço, horário, programação, passeios). Confirmar as datas com a Prefeitura.
  */
  modoInformativo: false,

  // Mostra a faixa "Protótipo em teste" no topo. Mudar para false ao publicar de verdade.
  prototipo: true
};
