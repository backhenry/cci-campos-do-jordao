/*
  Página "Conferir a planilha": lê as 4 abas como o site lê e lista, em
  português simples, o que o site não conseguiu entender.

  Dois tipos de recado:
    problema    – a linha não aparece no site, ou aparece errada. Precisa arrumar.
    observação  – está certo, mas é bom saber (linha desligada, data que já passou).
*/
(function () {
  "use strict";

  var CONFIG = window.CCI_CONFIG || { planilha: {} };
  var L = window.CCI_LEITURA;

  var COLUNAS = {
    programacao: ["dia_da_semana", "horario_inicio", "horario_fim", "atividade", "responsavel", "semana_do_mes", "local", "observacao", "ativo"],
    eventos: ["data", "horario", "tipo", "titulo", "descricao", "local", "como_participar", "ativo"],
    noticias: ["data", "titulo", "texto", "link_da_foto", "descricao_da_foto", "autorizacao_de_imagem", "ativo"],
    avisos: ["aviso", "importante", "mostrar_a_partir_de", "mostrar_ate", "ativo"]
  };

  var TIPOS_SEM_ATIVIDADE = ["feriado", "sem atividade", "recesso", "fechado", "ponto facultativo"];

  function el(tag, attrs, filhos) {
    var no = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) no.setAttribute(k === "class" ? "class" : k, attrs[k]); });
    (filhos || []).forEach(function (f) {
      if (f == null || f === "") return;
      no.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return no;
  }

  function hoje() {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date()).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function entreAspas(v) { return "“" + v + "”"; }

  // Valor de sim/não que não é nem um nem outro
  function confereSimNao(r, linha, coluna, seErrado) {
    var v = linha[coluna];
    if (v && !L.sim(v) && !L.nao(v)) r.problema(linha, "coluna " + coluna + " está " + entreAspas(v) + ". Escreva sim ou não. " + seErrado);
  }

  function confereData(r, linha, coluna, obrigatoria, seErrado) {
    var v = linha[coluna];
    if (!v) { if (obrigatoria) r.problema(linha, "falta a data (coluna " + coluna + "). " + seErrado); return null; }
    var d = L.lerData(v);
    if (!d) r.problema(linha, "a data " + entreAspas(v) + " (coluna " + coluna + ") não foi entendida. Use dia/mês/ano, como 14/11/2026. " + seErrado);
    return d;
  }

  // Junta os recados de uma aba
  function novoRelatorio() {
    var r = { problemas: [], observacoes: [] };
    r.problema = function (linha, texto) { r.problemas.push("Linha " + linha._linha + ": " + texto); };
    r.observacao = function (linha, texto) { r.observacoes.push("Linha " + linha._linha + ": " + texto); };
    return r;
  }

  function conferirProgramacao(linhas, r) {
    linhas.forEach(function (a) {
      if (!L.ativo(a)) {
        confereSimNao(r, a, "ativo", "Por enquanto a atividade está escondida.");
        if (L.nao(a.ativo)) r.observacao(a, (a.atividade || "atividade") + " está desligada (ativo = não).");
        return;
      }
      var nome = a.atividade ? entreAspas(a.atividade) : "a atividade";
      if (!a.atividade) r.problema(a, "falta o nome da atividade. A linha aparece sem nome.");
      if (L.numeroDoDia(a.dia_da_semana) < 0) {
        r.problema(a, a.dia_da_semana ? "o dia " + entreAspas(a.dia_da_semana) + " não foi entendido. " + maiuscula(nome) + " não aparece no site. Escolha o dia na lista (segunda a domingo)."
          : "falta o dia da semana. " + maiuscula(nome) + " não aparece no site.");
      }
      var ini = L.lerHora(a.horario_inicio), fim = L.lerHora(a.horario_fim);
      if (!a.horario_inicio) r.problema(a, "falta o horário de início de " + nome + ".");
      else if (!ini) r.problema(a, "o horário " + entreAspas(a.horario_inicio) + " não foi entendido. Escreva como 09:00.");
      if (a.horario_fim && !fim) r.problema(a, "o horário de fim " + entreAspas(a.horario_fim) + " não foi entendido. Escreva como 10:00.");
      if (ini && fim && fim <= ini) r.problema(a, nome + " termina (" + fim + ") antes ou na mesma hora em que começa (" + ini + "). Confira os horários.");
      if (L.ordinalDoMes(a.semana_do_mes) < 0) r.problema(a, "semana_do_mes está " + entreAspas(a.semana_do_mes) + ". Use 1, 2, 3, 4, 5 ou última, ou deixe vazio para toda semana. Enquanto isso, " + nome + " aparece toda semana.");
      if (a.ativo === "") r.observacao(a, "a coluna ativo está vazia. O site mostra a atividade; para esconder, escreva não.");
    });
  }

  function ehSemAtividade(e) {
    var t = L.semAcento(e.tipo);
    return TIPOS_SEM_ATIVIDADE.some(function (p) { return t.indexOf(p) === 0; });
  }

  function conferirEventos(linhas, r) {
    var d0 = hoje(), datas = {};
    linhas.forEach(function (e) {
      if (!L.ativo(e)) { confereSimNao(r, e, "ativo", "Por enquanto a linha está escondida."); return; }
      var fechado = ehSemAtividade(e);
      var d = confereData(r, e, "data", true, fechado ? "O site não sabe que dia está fechado." : "O evento não aparece no site.");
      if (!fechado && !e.titulo) r.problema(e, "falta o título do evento.");
      if (fechado && !e.titulo) r.observacao(e, "dia sem atividade sem motivo no título. O site mostra só " + entreAspas(e.tipo) + ".");
      if (d && d < d0) r.observacao(e, (e.titulo || e.tipo || "evento") + " (" + d.toLocaleDateString("pt-BR") + ") já passou e não aparece mais. Pode apagar a linha.");
      if (d && fechado) {
        var k = d.toDateString();
        if (datas[k]) r.observacao(e, "o dia " + d.toLocaleDateString("pt-BR") + " já está marcado como sem atividade na linha " + datas[k] + ".");
        datas[k] = e._linha;
      }
    });
  }

  function conferirNoticias(linhas, r) {
    linhas.forEach(function (n) {
      if (!L.ativo(n)) { confereSimNao(r, n, "ativo", "Por enquanto a notícia está escondida."); return; }
      if (!n.titulo) r.problema(n, "falta o título da notícia.");
      if (n.data && !L.lerData(n.data)) r.problema(n, "a data " + entreAspas(n.data) + " não foi entendida. Use dia/mês/ano.");
      if (n.link_da_foto) {
        var linkOk = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)[\w-]+/.test(n.link_da_foto) || /^https:\/\//.test(n.link_da_foto);
        if (!linkOk) r.problema(n, "o link da foto não foi entendido. Copie o link pelo Google Drive (Compartilhar > Copiar link).");
        else if (!L.sim(n.autorizacao_de_imagem)) r.observacao(n, "tem foto, mas autorizacao_de_imagem não está sim. A foto não aparece (é a proteção do termo de imagem).");
        else if (!n.descricao_da_foto) r.problema(n, "falta descricao_da_foto: diga em poucas palavras o que aparece, para quem não enxerga bem.");
      }
      confereSimNao(r, n, "autorizacao_de_imagem", "Enquanto isso, a foto não aparece.");
    });
  }

  function conferirAvisos(linhas, r) {
    var d0 = hoje();
    linhas.forEach(function (a) {
      if (!L.ativo(a)) { confereSimNao(r, a, "ativo", "Por enquanto o aviso está escondido."); return; }
      if (!a.aviso) r.problema(a, "a coluna aviso está vazia.");
      confereSimNao(r, a, "importante", "Enquanto isso, o aviso sai como normal (não vermelho).");
      var ini = confereData(r, a, "mostrar_a_partir_de", false, "O aviso aparece desde já.");
      var fim = confereData(r, a, "mostrar_ate", false, "O aviso fica para sempre.");
      if (ini && fim && fim < ini) r.problema(a, "mostrar_ate é antes de mostrar_a_partir_de. O aviso nunca aparece.");
      if (fim && fim < d0) r.observacao(a, "este aviso venceu em " + fim.toLocaleDateString("pt-BR") + " e não aparece mais. Pode apagar a linha.");
    });
  }

  var CONFERIR = { programacao: conferirProgramacao, eventos: conferirEventos, noticias: conferirNoticias, avisos: conferirAvisos };

  function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function buscar(nome) {
    var url = (CONFIG.planilha || {})[nome] || ("dados/" + nome + ".csv");
    return fetch(url, { cache: "no-store" }).then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.text();
    });
  }

  function cartaoDaAba(nome, linhas, erroDeBusca) {
    var r = novoRelatorio();
    if (erroDeBusca) {
      r.problemas.push("Não foi possível ler esta aba agora. Confira a internet. Se continuar, a aba pode ter sido renomeada ou tirada de \"Publicar na web\": avise o voluntário.");
    } else {
      var faltando = COLUNAS[nome].filter(function (c) { return linhas.colunas.indexOf(c) === -1; });
      if (faltando.length) {
        r.problemas.push("Na primeira linha (os nomes das colunas) falta: " + faltando.join(", ") +
          ". Alguém mudou ou apagou o nome. Volte como estava em Arquivo > Histórico de versões, ou avise o voluntário.");
      }
      CONFERIR[nome](linhas, r);
    }
    var ok = !r.problemas.length;
    var resumo = erroDeBusca ? "Não deu para ler." :
      ok ? "Tudo certo. " + linhas.length + (linhas.length === 1 ? " linha lida." : " linhas lidas.")
        : r.problemas.length + (r.problemas.length === 1 ? " coisa para arrumar." : " coisas para arrumar.");
    return el("section", { class: "cartao aba " + (ok ? "aba-ok" : "aba-erro") }, [
      el("h2", {}, ["Aba " + nome]),
      el("p", { class: "resumo" }, [resumo]),
      r.problemas.length ? el("ul", { class: "problemas" }, r.problemas.map(function (p) { return el("li", {}, [p]); })) : null,
      r.observacoes.length ? el("details", { class: "observacoes" }, [
        el("summary", {}, ["Para saber (" + r.observacoes.length + "), não precisa arrumar"]),
        el("ul", { class: "problemas" }, r.observacoes.map(function (p) { return el("li", {}, [p]); }))
      ]) : null
    ]);
  }

  function conferirTudo() {
    var alvo = document.getElementById("resultado");
    alvo.innerHTML = "<p class=\"carregando\">Lendo a planilha…</p>";
    var nomes = Object.keys(COLUNAS);
    Promise.all(nomes.map(function (nome) {
      return buscar(nome).then(function (t) { return cartaoDaAba(nome, L.lerCSV(t)); })
        .catch(function () { return cartaoDaAba(nome, [], true); });
    })).then(function (cartoes) {
      alvo.innerHTML = "";
      cartoes.forEach(function (c) { alvo.appendChild(c); });
      document.getElementById("quando").textContent = "Conferido às " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) + ".";
    });
  }

  document.getElementById("conferir-de-novo").addEventListener("click", conferirTudo);
  conferirTudo();
})();
