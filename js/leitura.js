/*
  Leitura da planilha: transforma o que a coordenação escreveu em dados que o
  site entende. Usado pelo site (app.js) e pela página de conferência
  (conferir.js), para os dois entenderem a planilha do mesmo jeito.

  Aceita os jeitos comuns de escrever, para um detalhe de digitação não
  esconder uma atividade:
    dia      "terça", "Terça-feira", "ter.", "3ª", "3a feira"
    horário  "9:00", "09:00:00", "9h", "9h30", "14:00h", "9.30"
    data     "02/11/2026", "2/11/26", "2/11" (ano atual), "2-11-2026", "2 de novembro"
    sim/não  "sim", "Sim", "SIM", "s", "x" / "não", "nao", "n"
*/
(function () {
  "use strict";

  var MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function semAcento(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  // Só letras e números: "Sim." e " sim " viram "sim"
  function compacto(texto) { return semAcento(texto).replace(/[^a-z0-9]/g, ""); }

  // Devolve a data ou null
  function lerData(texto, anoPadrao) {
    var t = semAcento(texto).replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, ""); // "02/11/2026 00:00:00"
    var ano, m = t.match(/^(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?$/);
    if (m) {
      ano = m[3] ? Number(m[3]) : (anoPadrao || new Date().getFullYear());
      if (ano < 100) ano += 2000;
      return dataValida(ano, Number(m[2]), Number(m[1]));
    }
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
    // "2 de novembro", "2 de novembro de 2026"
    m = t.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?(?:\s*(?:de\s+)?(\d{4}))?$/);
    if (m) {
      var mes = MESES.findIndex(function (nome) { return m[2].length >= 3 && nome.indexOf(m[2]) === 0; });
      if (mes >= 0) return dataValida(m[3] ? Number(m[3]) : (anoPadrao || new Date().getFullYear()), mes + 1, Number(m[1]));
    }
    return null;
  }

  // Recusa 31/02 e afins, em vez de virar 3 de março
  function dataValida(ano, mes, dia) {
    var d = new Date(ano, mes - 1, dia);
    return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null;
  }

  // "segunda", "Segunda-feira", "seg", "2ª" -> 1 (domingo = 0). Não reconhecido -> -1
  function numeroDoDia(texto) {
    var t = semAcento(texto);
    var n = t.match(/^([2-6])\s*(?:a|ª|º|o)?(?:[\s-]*feira)?\.?$/);
    if (n) return Number(n[1]) - 1;
    // "ter", "terca", "tercafeira" valem; "qualquer" não vira quarta
    var c = compacto(t);
    if (c.length < 3) return -1;
    return ["domingo", "segundafeira", "tercafeira", "quartafeira", "quintafeira", "sextafeira", "sabado"]
      .findIndex(function (nome) { return nome.indexOf(c) === 0; });
  }

  function sim(valor) { return ["sim", "s", "x", "yes", "1", "ok", "verdadeiro", "true"].indexOf(compacto(valor)) !== -1; }
  function nao(valor) { return ["nao", "n", "no", "0", "falso", "false"].indexOf(compacto(valor)) !== -1; }

  // Coluna ativo: vazio também conta como sim (para não sumir linha por esquecimento)
  function ativo(linha) { return linha.ativo === undefined || linha.ativo === "" || sim(linha.ativo); }

  // Devolve "09:30" ou "" se não for um horário
  function lerHora(texto) {
    var t = semAcento(texto).replace(/\s+/g, "");
    var m = t.match(/^(\d{1,2})(?:[:h.](\d{2}))?(?::\d{2})?(h|hs|hrs|horas|min|am|pm)?$/);
    if (!m) return "";
    var h = Number(m[1]), min = Number(m[2] || 0);
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    if (h > 23 || min > 59) return "";
    return (h < 10 ? "0" : "") + h + ":" + (min < 10 ? "0" : "") + min;
  }

  // Para mostrar: o horário arrumado, ou o texto como veio se não for horário
  function hhmm(texto) { return lerHora(texto) || String(texto || "").trim(); }

  // Coluna semana_do_mes: vazio = toda semana (0); 1 a 5, "1ª", "primeira"; "última" = 9; inválido = -1
  function ordinalDoMes(valor) {
    var t = compacto(valor);
    if (!t) return 0;
    if (t.indexOf("ult") === 0) return 9;
    var porNome = ["primeira", "segunda", "terceira", "quarta", "quinta"].indexOf(t);
    if (porNome >= 0) return porNome + 1;
    var n = t.match(/^([1-5])(a|o)?$/);
    return n ? Number(n[1]) : -1;
  }

  /*
    Lê o CSV publicado pela planilha. Cada linha vira um objeto com os nomes
    das colunas, mais "_linha": o número da linha na planilha (a 1 é o cabeçalho),
    para a página de conferência apontar onde está cada problema.
  */
  function lerCSV(texto) {
    var linhas = [], linha = [], campo = "", aspas = false;
    texto = String(texto).replace(/^\ufeff/, "");
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (aspas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') aspas = false;
        else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ",") { linha.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = "";
      } else campo += c;
    }
    if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }

    var cabecalho = (linhas.shift() || []).map(function (h) { return semAcento(h).replace(/\s+/g, "_"); });
    var resultado = [];
    linhas.forEach(function (l, i) {
      if (!l.some(function (v) { return v.trim() !== ""; })) return;
      var obj = { _linha: i + 2 };
      cabecalho.forEach(function (h, j) { if (h) obj[h] = (l[j] || "").trim(); });
      resultado.push(obj);
    });
    resultado.colunas = cabecalho;
    return resultado;
  }

  window.CCI_LEITURA = {
    semAcento: semAcento,
    lerData: lerData,
    numeroDoDia: numeroDoDia,
    sim: sim,
    nao: nao,
    ativo: ativo,
    lerHora: lerHora,
    hhmm: hhmm,
    ordinalDoMes: ordinalDoMes,
    lerCSV: lerCSV
  };
})();
