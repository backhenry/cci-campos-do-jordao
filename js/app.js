/*
  Site do CCI: lê a planilha do Google e monta a programação, os passeios,
  as notícias e os avisos.

  Se a planilha falhar (internet ruim, link quebrado), o site:
    1. usa a última versão que já tinha conseguido carregar neste celular;
    2. se nunca carregou, mostra o recado para ligar ou ir até o CCI.
  O endereço, o horário e o telefone estão escritos direto na página e
  aparecem sempre, mesmo sem planilha e sem internet boa.
*/
(function () {
  "use strict";

  var CONFIG = window.CCI_CONFIG || { planilha: {} };
  var VERSAO_CACHE = "cci-v1-";
  var TEMPO_LIMITE_MS = 8000;
  var FUSO = "America/Sao_Paulo";

  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  var ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // começa na segunda
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"];

  // ---------- Utilidades ----------

  function semAcento(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function el(tag, attrs, filhos) {
    var no = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === "class") no.className = attrs[k];
      else no.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) {
      if (f == null || f === "") return;
      no.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return no;
  }

  function limpar(no) { while (no.firstChild) no.removeChild(no.firstChild); }

  // Data de hoje no horário de Brasília (ano, mês, dia, dia da semana)
  function hoje() {
    var partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date()).split("-");
    var d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return d;
  }

  // Aceita "15/11/2026", "15/11/26" ou "2026-11-15"
  function lerData(texto) {
    var t = String(texto || "").trim();
    var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      var ano = Number(m[3]); if (ano < 100) ano += 2000;
      return new Date(ano, Number(m[2]) - 1, Number(m[1]));
    }
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }

  function dataPorExtenso(d) {
    return DIAS[d.getDay()] + ", " + d.getDate() + " de " + MESES[d.getMonth()];
  }

  // "segunda", "Segunda-feira", "seg" -> 1
  function numeroDoDia(texto) {
    var t = semAcento(texto).slice(0, 3);
    return ["dom", "seg", "ter", "qua", "qui", "sex", "sab"].indexOf(t);
  }

  function sim(valor) { return ["sim", "s", "x", "yes", "1"].indexOf(semAcento(valor)) !== -1; }
  function ativo(linha) { return linha.ativo === undefined || linha.ativo === "" || sim(linha.ativo); }
  function ehExemplo(texto) { return /\[?exemplo\]?/i.test(texto || ""); }

  // Tira o "[EXEMPLO]" do texto e devolve o selo separado
  function textoComSelo(texto) {
    var limpo = String(texto || "").replace(/\[?exemplo\]?\s*/i, "").trim();
    var partes = [limpo];
    if (ehExemplo(texto)) partes.push(" ", el("span", { class: "selo selo-exemplo" }, ["EXEMPLO"]));
    return partes;
  }

  // ---------- Leitura de CSV (o formato da planilha publicada) ----------

  function lerCSV(texto) {
    var linhas = [], linha = [], campo = "", aspas = false;
    texto = String(texto).replace(/^﻿/, "");
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
    return linhas
      .filter(function (l) { return l.some(function (v) { return v.trim() !== ""; }); })
      .map(function (l) {
        var obj = {};
        cabecalho.forEach(function (h, i) { obj[h] = (l[i] || "").trim(); });
        return obj;
      });
  }

  // ---------- Busca com plano B ----------

  function buscarTexto(url) {
    var controle = "AbortController" in window ? new AbortController() : null;
    var timer = controle && setTimeout(function () { controle.abort(); }, TEMPO_LIMITE_MS);
    return fetch(url, { cache: "no-store", signal: controle ? controle.signal : undefined })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      });
  }

  function salvarCache(nome, texto) {
    try { localStorage.setItem(VERSAO_CACHE + nome, JSON.stringify({ quando: Date.now(), texto: texto })); } catch (e) { /* sem espaço ou bloqueado */ }
  }
  function lerCache(nome) {
    try { return JSON.parse(localStorage.getItem(VERSAO_CACHE + nome)); } catch (e) { return null; }
  }

  /*
    Devolve { linhas, origem } onde origem é:
      "planilha" – veio agora da planilha;
      "cache"    – planilha falhou, usando a última cópia salva;
      "exemplo"  – planilha ainda não configurada (protótipo).
    Se nada der certo, a promessa falha e a página mantém o recado de falha.
  */
  function carregar(nome) {
    var url = (CONFIG.planilha || {})[nome];
    if (!url) {
      return buscarTexto("dados/" + nome + ".csv").then(function (t) {
        return { linhas: lerCSV(t), origem: "exemplo" };
      });
    }
    return buscarTexto(url).then(function (t) {
      var linhas = lerCSV(t);
      salvarCache(nome, t);
      return { linhas: linhas, origem: "planilha" };
    }).catch(function () {
      var c = lerCache(nome);
      if (c && c.texto) return { linhas: lerCSV(c.texto), origem: "cache", quando: c.quando };
      throw new Error("sem dados");
    });
  }

  function mostrarEstado(id, resultado) {
    var alvo = document.getElementById(id);
    if (!alvo) return;
    if (resultado.origem === "cache") {
      var d = new Date(resultado.quando);
      alvo.textContent = "Não conseguimos atualizar agora. Mostrando a versão salva em " +
        d.toLocaleDateString("pt-BR") + ". Pode haver mudanças: na dúvida, ligue para o CCI.";
    } else {
      alvo.textContent = "";
    }
  }

  // ---------- Programação ----------

  // A planilha pode publicar "9:00:00" quando a hora é digitada como hora; mostra "09:00"
  function hhmm(texto) {
    var m = String(texto || "").trim().match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
    return m ? (m[1].length === 1 ? "0" + m[1] : m[1]) + ":" + m[2] : String(texto || "").trim();
  }

  // Coluna semana_do_mes: vazio = toda semana; 1, 2, 3, 4, 5 = só naquela semana do mês; "última"
  function ordinalDoMes(valor) {
    var t = semAcento(valor);
    if (t.indexOf("ult") === 0) return 9;
    var n = parseInt(t, 10);
    return isNaN(n) ? 0 : n;
  }

  function rotuloOrdinal(valor) {
    var n = ordinalDoMes(valor);
    return n === 9 ? "Última" : n + "ª";
  }

  function valeNaData(a, data) {
    var n = ordinalDoMes(a.semana_do_mes);
    if (!n) return true;
    if (n === 9) return data.getDate() + 7 > new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
    return Math.ceil(data.getDate() / 7) === n;
  }

  function itemAtividade(a) {
    var hora = hhmm(a.horario_inicio) + (a.horario_fim ? " às " + hhmm(a.horario_fim) : "");
    var det = [a.responsavel ? "com " + a.responsavel : "", a.local, a.observacao].filter(Boolean).join(" · ");
    return el("li", {}, [
      el("span", { class: "hora" }, [hora]),
      el("span", {}, textoComSelo(a.atividade)),
      det ? el("span", { class: "det" }, [det]) : null
    ]);
  }

  function ordenarPorHora(a, b) {
    return hhmm(a.horario_inicio).localeCompare(hhmm(b.horario_inicio));
  }

  // Hora atual em Brasília, em minutos desde a meia-noite
  function agoraEmMinutos() {
    var p = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false })
      .format(new Date()).split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function emMinutos(texto) {
    var m = hhmm(texto).match(/^(\d{2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function semExemplo(t) { return String(t || "").replace(/\[?exemplo\]?\s*/i, "").trim(); }
  function comQuem(a) { return semExemplo(a.atividade) + (a.responsavel ? " com " + a.responsavel : ""); }
  function somaDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function agruparPorDia(linhas) {
    var porDia = {};
    linhas.filter(ativo).forEach(function (a) {
      var n = numeroDoDia(a.dia_da_semana);
      if (n < 0) return;
      (porDia[n] = porDia[n] || []).push(a);
    });
    return porDia;
  }

  function atividadesDaData(porDia, data) {
    return (porDia[data.getDay()] || []).filter(function (a) { return valeNaData(a, data); }).sort(ordenarPorHora);
  }

  // Primeiro dia com atividade depois de "data" (até 14 dias à frente)
  function proximoDiaComAtividade(porDia, data) {
    for (var i = 1; i <= 14; i++) {
      var dia = somaDias(data, i);
      var lista = atividadesDaData(porDia, dia);
      if (lista.length) return { data: dia, lista: lista, distancia: i };
    }
    return null;
  }

  // Frase de destaque do cartão "Hoje": o que está acontecendo agora ou o que vem a seguir
  function fraseDeDestaque(porDia, d, deHoje) {
    var agora = agoraEmMinutos();
    for (var i = 0; i < deHoje.length; i++) {
      var ini = emMinutos(deHoje[i].horario_inicio), fim = emMinutos(deHoje[i].horario_fim);
      if (ini !== null && fim !== null && ini <= agora && agora < fim) {
        return "Agora: " + comQuem(deHoje[i]) + ", até " + hhmm(deHoje[i].horario_fim) + ".";
      }
    }
    for (var j = 0; j < deHoje.length; j++) {
      var inicio = emMinutos(deHoje[j].horario_inicio);
      if (inicio !== null && inicio > agora) {
        var falta = inicio - agora <= 120 ? "Daqui a pouco, às " : "A próxima é às ";
        return falta + hhmm(deHoje[j].horario_inicio) + ": " + comQuem(deHoje[j]) + ".";
      }
    }
    var prox = proximoDiaComAtividade(porDia, d);
    var inicioFrase = deHoje.length ? "As atividades de hoje já terminaram. " : "Hoje não tem atividade marcada. ";
    if (!prox) return inicioFrase + "Na dúvida, ligue para o CCI.";
    var quando = prox.distancia === 1 ? "Amanhã (" + DIAS[prox.data.getDay()] + ")" : maiuscula(dataPorExtenso(prox.data));
    return inicioFrase + quando + ", a primeira é às " + hhmm(prox.lista[0].horario_inicio) + ": " + comQuem(prox.lista[0]) + ".";
  }

  // "sábado e domingo", "segunda, sábado e domingo"
  function juntarNomes(nomes) {
    if (nomes.length <= 1) return nomes.join("");
    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
  }

  function montarProgramacao(resultado) {
    var porDia = agruparPorDia(resultado.linhas);
    var d = hoje();

    // Cartão "Hoje": destaque do momento + lista do dia
    var boxHoje = document.getElementById("hoje");
    limpar(boxHoje);
    var deHoje = atividadesDaData(porDia, d);
    boxHoje.appendChild(el("h3", {}, ["Hoje, " + dataPorExtenso(d)]));
    boxHoje.appendChild(el("p", { class: "destaque-agora" }, [fraseDeDestaque(porDia, d, deHoje)]));
    if (deHoje.length) boxHoje.appendChild(el("ul", { class: "atividades" }, deHoje.map(itemAtividade)));

    // Próximos 6 dias (a partir de amanhã). Dias sem atividade viram uma linha só.
    var semana = document.getElementById("semana");
    limpar(semana);
    var vazios = [];
    for (var i = 1; i <= 6; i++) {
      var dataDia = somaDias(d, i);
      var lista = atividadesDaData(porDia, dataDia);
      var nome = DIAS[dataDia.getDay()];
      if (!lista.length) { vazios.push(nome); continue; }
      var titulo = (i === 1 ? "Amanhã, " + nome : maiuscula(nome)) + ", " + dataDia.getDate() + "/" + (dataDia.getMonth() + 1);
      semana.appendChild(el("div", { class: "dia" }, [
        el("h4", {}, [titulo]),
        el("ul", { class: "atividades" }, lista.map(itemAtividade))
      ]));
    }
    var semAtividade = document.getElementById("sem-atividade");
    if (semAtividade) semAtividade.textContent = vazios.length ? maiuscula(juntarNomes(vazios)) + ": sem atividades." : "";

    montarHorariosDosGrupos(resultado.linhas);
    ultimaProgramacao = resultado.linhas;

    // Atividades que mudam conforme a semana do mês (ex.: 1ª sexta = Bingo)
    var mensais = resultado.linhas.filter(ativo).filter(function (a) { return a.semana_do_mes; });
    var boxMes = document.getElementById("mensais");
    if (boxMes) {
      limpar(boxMes);
      if (mensais.length) {
        mensais.sort(function (a, b) {
          return ORDEM_SEMANA.indexOf(numeroDoDia(a.dia_da_semana)) - ORDEM_SEMANA.indexOf(numeroDoDia(b.dia_da_semana)) ||
            ordinalDoMes(a.semana_do_mes) - ordinalDoMes(b.semana_do_mes);
        });
        boxMes.appendChild(el("h3", { class: "subtitulo" }, ["Atividades de cada mês"]));
        boxMes.appendChild(el("p", {}, ["Algumas atividades mudam conforme a semana do mês:"]));
        boxMes.appendChild(el("ul", { class: "atividades" }, mensais.map(function (a) {
          var hora = hhmm(a.horario_inicio) + (a.horario_fim ? " às " + hhmm(a.horario_fim) : "");
          var n = numeroDoDia(a.dia_da_semana);
          return el("li", {}, [
            el("span", { class: "hora" }, [rotuloOrdinal(a.semana_do_mes) + " " + DIAS[n].replace("-feira", "") + " do mês, " + hora]),
            el("span", {}, textoComSelo(a.atividade))
          ]);
        })));
      }
    }

    mostrarEstado("estado-programacao", resultado);
  }

  // "Quarta, 14:00 às 15:00, com Estela" ou "1ª sexta do mês, 14:00 às 16:00"
  function quandoAcontece(a) {
    var n = numeroDoDia(a.dia_da_semana);
    var dia = DIAS[n].replace("-feira", "");
    if (a.semana_do_mes) dia = rotuloOrdinal(a.semana_do_mes) + " " + dia + " do mês";
    var hora = hhmm(a.horario_inicio) + (a.horario_fim ? " às " + hhmm(a.horario_fim) : "");
    return maiuscula(dia) + ", " + hora + (a.responsavel ? ", com " + a.responsavel : "");
  }

  // Cada grupo de "O que se faz por aqui" mostra, ao abrir, os dias e horários vindos da planilha
  function montarHorariosDosGrupos(linhas) {
    var validas = linhas.filter(ativo).filter(function (a) { return numeroDoDia(a.dia_da_semana) >= 0; });
    document.querySelectorAll(".grupo-horarios").forEach(function (caixa) {
      var chaves = (caixa.getAttribute("data-busca") || "").split(",");
      var achadas = validas.filter(function (a) {
        var nome = semAcento(a.atividade);
        return chaves.some(function (c) { return c && nome.indexOf(c) !== -1; });
      }).sort(function (a, b) {
        return ORDEM_SEMANA.indexOf(numeroDoDia(a.dia_da_semana)) - ORDEM_SEMANA.indexOf(numeroDoDia(b.dia_da_semana)) || ordenarPorHora(a, b);
      });
      if (!achadas.length) return;
      // agrupa pelo nome da atividade, na ordem em que aparece na semana
      var porNome = {}, ordem = [];
      achadas.forEach(function (a) {
        var nome = semExemplo(a.atividade);
        if (!porNome[nome]) { porNome[nome] = []; ordem.push(nome); }
        porNome[nome].push(quandoAcontece(a));
      });
      limpar(caixa);
      caixa.appendChild(el("dl", { class: "horarios" }, ordem.reduce(function (acc, nome) {
        acc.push(el("dt", {}, [nome]));
        porNome[nome].forEach(function (q) { acc.push(el("dd", {}, [q])); });
        return acc;
      }, [])));
    });
  }

  // ---------- Folha para imprimir ----------

  var ultimaProgramacao = null;

  function montarFolhaImpressao() {
    var folha = document.getElementById("folha-impressao");
    if (!folha) return;
    limpar(folha);
    folha.appendChild(el("h1", {}, ["Programação do CCI"]));
    folha.appendChild(el("p", {}, ["Centro de Convivência do Idoso de Campos do Jordão · Av. Frei Orestes Girardi, 105, Abernéssia · Telefone " +
      (document.querySelector(".js-telefone-texto") || {}).textContent]));
    if (!ultimaProgramacao) {
      folha.appendChild(el("p", {}, ["A programação não carregou. Ligue para o CCI."]));
      return;
    }
    var porDia = agruparPorDia(ultimaProgramacao);
    ORDEM_SEMANA.forEach(function (n) {
      var lista = (porDia[n] || []).slice().sort(ordenarPorHora);
      if (!lista.length) return;
      folha.appendChild(el("h2", {}, [maiuscula(DIAS[n])]));
      folha.appendChild(el("ul", {}, lista.map(function (a) {
        var hora = hhmm(a.horario_inicio) + (a.horario_fim ? " às " + hhmm(a.horario_fim) : "");
        var extra = a.semana_do_mes ? " (só na " + rotuloOrdinal(a.semana_do_mes).toLowerCase() + " " + DIAS[n].replace("-feira", "") + " do mês)" : "";
        return el("li", {}, [el("strong", {}, [hora]), "  " + comQuem(a) + extra]);
      })));
    });
    folha.appendChild(el("p", { class: "folha-rodape" }, ["Pode haver mudanças. Na dúvida, ligue para o CCI. Impresso em " + hoje().toLocaleDateString("pt-BR") + "."]));
  }

  function prepararImpressao() {
    document.querySelectorAll(".js-imprimir").forEach(function (b) {
      b.addEventListener("click", function () {
        montarFolhaImpressao();
        document.body.classList.add("imprimindo-programacao");
        window.print();
      });
    });
    window.addEventListener("afterprint", function () { document.body.classList.remove("imprimindo-programacao"); });
  }

  // ---------- WhatsApp ----------

  function prepararWhatsApp() {
    var tel = (document.querySelector(".js-telefone-texto") || {}).textContent || "";
    var endereco = location.protocol.indexOf("http") === 0 ? location.origin + location.pathname : "";
    var texto = "Centro de Convivência do Idoso (CCI) de Campos do Jordão: atividades gratuitas para quem tem 60 anos ou mais, de segunda a sexta. " +
      "Av. Frei Orestes Girardi, 105, Abernéssia. Telefone " + tel + "." + (endereco ? " Programação: " + endereco : "");
    document.querySelectorAll(".js-whatsapp").forEach(function (a) {
      a.href = "https://wa.me/?text=" + encodeURIComponent(texto);
    });
  }

  // ---------- Tamanho da letra (guardado só neste aparelho) ----------

  var TAMANHOS = [100, 112.5, 125, 137.5];

  function aplicarTamanho(indice) {
    indice = Math.max(0, Math.min(TAMANHOS.length - 1, indice));
    document.documentElement.style.fontSize = TAMANHOS[indice] + "%";
    document.querySelectorAll(".js-letra").forEach(function (b) {
      var passo = Number(b.getAttribute("data-passo"));
      b.disabled = (passo < 0 && indice === 0) || (passo > 0 && indice === TAMANHOS.length - 1);
    });
    try { localStorage.setItem("cci-letra", String(indice)); } catch (e) { /* sem problema */ }
    return indice;
  }

  function prepararTamanhoDaLetra() {
    var atual = 0;
    try { atual = Number(localStorage.getItem("cci-letra")) || 0; } catch (e) { /* sem problema */ }
    atual = aplicarTamanho(atual);
    document.querySelectorAll(".js-letra").forEach(function (b) {
      b.addEventListener("click", function () { atual = aplicarTamanho(atual + Number(b.getAttribute("data-passo"))); });
    });
  }

  // ---------- Passeios e eventos ----------

  function montarEventos(resultado) {
    var d = hoje();
    var futuros = resultado.linhas.filter(ativo)
      .map(function (e) { e._data = lerData(e.data); return e; })
      .filter(function (e) { return e._data && e._data >= d; })
      .sort(function (a, b) { return a._data - b._data; });

    var alvo = document.getElementById("eventos");
    limpar(alvo);
    if (!futuros.length) {
      alvo.appendChild(el("p", { class: "vazio" }, ["Nenhum passeio ou evento marcado no momento. Pergunte no CCI."]));
    }
    var mesAtual = "";
    futuros.forEach(function (e) {
      var mes = MESES[e._data.getMonth()] + " de " + e._data.getFullYear();
      if (mes !== mesAtual) {
        mesAtual = mes;
        alvo.appendChild(el("h3", { class: "mes" }, [mes.charAt(0).toUpperCase() + mes.slice(1)]));
      }
      var quando = dataPorExtenso(e._data) + (e.horario ? ", " + e.horario : "");
      // Bloco de calendário (dia e mês) é só visual; a data por extenso vem logo depois
      var folhinha = el("div", { class: "evento-data", "aria-hidden": "true" }, [
        el("span", { class: "dia-num" }, [String(e._data.getDate())]),
        el("span", { class: "mes-abrev" }, [MESES[e._data.getMonth()].slice(0, 3)])
      ]);
      alvo.appendChild(el("article", { class: "cartao evento" }, [
        folhinha,
        el("div", { class: "evento-corpo" }, [
          e.tipo ? el("p", { class: "tipo" }, [e.tipo]) : null,
          el("p", { class: "data" }, [quando.charAt(0).toUpperCase() + quando.slice(1)]),
          el("h3", {}, textoComSelo(e.titulo)),
          e.descricao ? el("p", {}, [e.descricao]) : null,
          e.local ? el("p", {}, [el("strong", {}, ["Local: "]), e.local]) : null,
          e.como_participar ? el("p", {}, [el("strong", {}, ["Como participar: "]), e.como_participar]) : null
        ])
      ]));
    });
    mostrarEstado("estado-eventos", resultado);
  }

  // ---------- Notícias ----------

  // Converte link de compartilhamento do Google Drive em link de imagem
  function linkDaFoto(link) {
    var m = String(link || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
    return /^https:\/\//.test(link || "") ? link : "";
  }

  function montarNoticias(resultado) {
    var alvo = document.getElementById("lista-noticias");
    limpar(alvo);
    var lista = resultado.linhas.filter(ativo)
      .map(function (n) { n._data = lerData(n.data); return n; })
      .sort(function (a, b) { return (b._data || 0) - (a._data || 0); });

    if (!lista.length) alvo.appendChild(el("p", { class: "vazio" }, ["Ainda não há notícias publicadas."]));

    lista.forEach(function (n) {
      var foto = null;
      var src = linkDaFoto(n.link_da_foto);
      // Foto só aparece com autorização de imagem marcada como "sim" na planilha.
      if (src && sim(n.autorizacao_de_imagem)) {
        foto = el("figure", { class: "foto" }, [
          el("img", { src: src, alt: n.descricao_da_foto || "", loading: "lazy", decoding: "async" }),
          n.descricao_da_foto ? el("figcaption", {}, [n.descricao_da_foto]) : null
        ]);
      } else if (ehExemplo(n.titulo)) {
        foto = el("div", { class: "foto-reservada", role: "img", "aria-label": "Espaço reservado para foto" }, [
          "Espaço para foto (EXEMPLO). Só com autorização de imagem assinada."
        ]);
      }
      alvo.appendChild(el("article", { class: "cartao noticia" }, [
        n._data ? el("p", { class: "data" }, [n._data.toLocaleDateString("pt-BR")]) : null,
        el("h3", {}, textoComSelo(n.titulo)),
        foto,
        n.texto ? el("p", {}, [n.texto]) : null
      ]));
    });
    mostrarEstado("estado-noticias", resultado);
  }

  // ---------- Avisos ----------

  function montarAvisos(resultado) {
    var d = hoje();
    var alvo = document.getElementById("avisos");
    limpar(alvo);
    resultado.linhas.filter(ativo).forEach(function (a) {
      var ini = lerData(a.mostrar_a_partir_de), fim = lerData(a.mostrar_ate);
      if (ini && d < ini) return;
      if (fim && d > fim) return;
      var importante = sim(a.importante);
      alvo.appendChild(el("div", { class: "aviso" + (importante ? "" : " aviso-normal"), role: importante ? "alert" : null }, [
        el("p", {}, [el("span", { class: "aviso-rotulo" }, [importante ? "Aviso importante: " : "Aviso: "])].concat(textoComSelo(a.aviso)))
      ]));
    });
  }

  // ---------- Configuração da página ----------

  function aplicarConfig() {
    if (CONFIG.modoInformativo) document.body.classList.add("modo-informativo");
    if (!CONFIG.prototipo) {
      var faixa = document.getElementById("faixa-prototipo");
      if (faixa) faixa.remove();
    }
    if (CONFIG.telefone) {
      var num = String(CONFIG.telefone).replace(/\D/g, "");
      var bonito = "(" + num.slice(0, 2) + ") " + num.slice(2, num.length - 4) + "-" + num.slice(-4);
      document.querySelectorAll(".js-telefone-link").forEach(function (a) { a.href = "tel:+55" + num; });
      document.querySelectorAll(".js-telefone-texto").forEach(function (s) { s.textContent = bonito; });
    }
    if (CONFIG.endereco) {
      var mapa = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CONFIG.endereco);
      document.querySelectorAll(".js-mapa-link").forEach(function (a) { a.href = mapa; });
    }
  }

  function falhou(idEstado, idAlvo, recado) {
    return function () {
      var alvo = document.getElementById(idAlvo);
      if (alvo) { limpar(alvo); alvo.appendChild(el("p", { class: "aviso-falha" }, [recado])); }
      var est = document.getElementById(idEstado);
      if (est) est.textContent = "";
    };
  }

  aplicarConfig();
  prepararTamanhoDaLetra();
  prepararWhatsApp();
  prepararImpressao();

  carregar("avisos").then(montarAvisos).catch(function () { /* sem avisos, sem problema */ });

  carregar("programacao").then(montarProgramacao).catch(function () {
    falhou("estado-programacao", "semana", "Não foi possível carregar a programação agora. Ligue para o CCI ou vá até lá: a programação também fica no mural da unidade.")();
    var boxHoje = document.getElementById("hoje");
    limpar(boxHoje);
    boxHoje.appendChild(el("h3", {}, ["Hoje"]));
    boxHoje.appendChild(el("p", {}, ["Programação indisponível no momento. Ligue para o CCI."]));
  });

  carregar("eventos").then(montarEventos)
    .catch(falhou("estado-eventos", "eventos", "Não foi possível carregar os passeios agora. Pergunte no CCI."));

  if (!CONFIG.modoInformativo) {
    carregar("noticias").then(montarNoticias)
      .catch(falhou("estado-noticias", "lista-noticias", "Não foi possível carregar as notícias agora."));
  }
})();
